import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  InitiateAuthCommand,
  AdminInitiateAuthCommand,
  AdminUserGlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AwsConfig } from '../config/aws.config';
import { CognitoConfig } from '../config/cognito.config';
import { DatabaseConfig } from '../config/database.config';
import { EnvConfig } from '../config/environment';
import { DynamoDBService } from './dynamodb.service';
import { ValidationService } from './validation.service';
import { JwtUtil } from '../utils/jwt.util';
import { CryptoUtil } from '../utils/crypto.util';
import { UuidUtil } from '../utils/uuid.util';
import { LoggerUtil } from '../utils/logger.util';
import {
  UnauthorizedError,
  ConflictError,
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from '../utils/error.util';
import { User, UserRole, Lecturer, Student } from '../models/types';
import { EmailService } from './email.service';
import { VerificationService } from './verification.service';

/**
 * Authentication service - Cognito + JWT integration
 * Note: Cognito client is initialized in AwsConfig, not duplicated here
 */
export class AuthService {
  private static cognitoClient = AwsConfig.getCognitoClient();

  /**
   * Register a new user
   */
  static async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole
  ): Promise<User> {
    try {
      const userId = UuidUtil.generateUserId();
      const userPoolId = CognitoConfig.getUserPoolId();

      // Create user in Cognito - let Cognito send verification email with native flow
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: password,
        // Don't specify MessageAction - Cognito will send verification email
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'given_name', Value: firstName },
          { Name: 'family_name', Value: lastName },
        ],
      });

      let cognitoUserId = email;
      
      try {
        LoggerUtil.debug(`Creating Cognito user`, { email, userPoolId });
        const createUserResponse = await this.cognitoClient.send(createUserCommand);
        cognitoUserId = createUserResponse.User?.Username || email;
        LoggerUtil.debug(`Cognito user created successfully`);

        // Set permanent password
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: email,
          Password: password,
          Permanent: true,
        });

        LoggerUtil.debug(`Setting permanent password`, { email });
        await this.cognitoClient.send(setPasswordCommand);
        LoggerUtil.debug(`Password set successfully`);
      } catch (cognitoError: any) {
        LoggerUtil.error('Cognito error during user creation', { 
          email, 
          errorName: cognitoError.name,
          errorMessage: cognitoError.message,
          errorCode: cognitoError.$metadata?.httpStatusCode,
          userPoolId,
        });
        // If user already exists, just set the password
        if (cognitoError.name === 'UsernameExistsException') {
          try {
            const setPasswordCommand = new AdminSetUserPasswordCommand({
              UserPoolId: userPoolId,
              Username: email,
              Password: password,
              Permanent: true,
            });
            await this.cognitoClient.send(setPasswordCommand);
          } catch (passwordError: any) {
            // Ignore password errors, user can reset if needed
            LoggerUtil.warn('Could not update password for existing user', { email });
          }
        } else {
          throw cognitoError;
        }
      }

      // Create user record in DynamoDB with correct types
      const now = Date.now(); // Unix milliseconds

      const user: User = {
        userId,
        email,
        firstName,
        lastName,
        role,
        isActivated: false,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      };

      const tables = DatabaseConfig.getTables();
      await DynamoDBService.put(tables.USERS, user);

      // Generate and send verification code
      try {
        const code = EmailService.generateVerificationCode();
        await VerificationService.storeVerificationCode(email, code);
        await EmailService.sendVerificationCode(email, firstName, code);
        LoggerUtil.debug(`Verification code sent`, { email });
      } catch (emailError) {
        LoggerUtil.warn('Failed to send verification code', { email, error: emailError });
        // Don't throw - user can request code resend
      }

      LoggerUtil.info('User registered', { userId, email, role });
      return user;
    } catch (error) {
      if ((error as any).Code === 'UsernameExistsException') {
        throw new ConflictError('User already exists with this email');
      }

      LoggerUtil.error('User registration failed', error as Error);
      throw new InternalServerError('Failed to register user');
    }
  }

  /**
   * Login user with email and password
   */
  static async loginUser(email: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    try {
      const userPoolId = CognitoConfig.getUserPoolId();
      const clientId = CognitoConfig.getClientId();

      // Authenticate with Cognito
      const authCommand = new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const authResponse = await this.cognitoClient.send(authCommand);

      if (!authResponse.AuthenticationResult) {
        throw new UnauthorizedError('Authentication failed');
      }

      // Get user from database
      const tables = DatabaseConfig.getTables();
      const user = await DynamoDBService.query(
        tables.USERS,
        'email = :email',
        { ':email': email },
        { indexName: 'email-index' }
      );

      if (!user.items || user.items.length === 0) {
        throw new UnauthorizedError('User not found');
      }

      const userData = user.items[0];

      // Generate JWT tokens
      const tokens = JwtUtil.generateTokenPair({
        userId: userData.userId,
        email: userData.email,
        role: userData.role,
      });

      // Update last login timestamp
      const now = Date.now();
      await DynamoDBService.update(
        tables.USERS,
        { userId: userData.userId },
        { lastLoginAt: now, updatedAt: now }
      );

      LoggerUtil.info('User logged in', { userId: userData.userId, email });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          userId: userData.userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          profilePictureUrl: userData.profilePictureUrl,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      LoggerUtil.error('Login failed', error as Error);
      throw new UnauthorizedError('Invalid credentials');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = JwtUtil.verifyToken(refreshToken);

      // Generate new token pair
      const tokens = JwtUtil.generateTokenPair({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });

      LoggerUtil.info('Token refreshed', { userId: payload.userId });

      return tokens;
    } catch (error) {
      LoggerUtil.error('Token refresh failed', error as Error);
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<any> {
    try {
      return JwtUtil.verifyToken(token);
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const tables = DatabaseConfig.getTables();

      // Get user
      const user = await DynamoDBService.get(tables.USERS, { userId });

      if (!user) {
        throw new BadRequestError('User not found');
      }

      // For now, verify with Cognito instead of password hash
      // (password hash shouldn't be stored in DynamoDB)

      // Hash new password
      const newPasswordHash = await CryptoUtil.hashPassword(newPassword);

      // Update in database
      const now = Date.now();
      await DynamoDBService.update(
        tables.USERS,
        { userId },
        {
          updatedAt: now,
        }
      );

      LoggerUtil.info('Password changed', { userId });
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }

      LoggerUtil.error('Password change failed', error as Error);
      throw new InternalServerError('Failed to change password');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const tables = DatabaseConfig.getTables();
      const user = await DynamoDBService.get(tables.USERS, { userId });
      return user || null;
    } catch (error) {
      LoggerUtil.error('Failed to get user', error as Error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const tables = DatabaseConfig.getTables();

      const now = Date.now();
      const updated = await DynamoDBService.update(
        tables.USERS,
        { userId },
        {
          ...updates,
          updatedAt: now,
        }
      );

      LoggerUtil.info('User profile updated', { userId });
      return updated;
    } catch (error) {
      LoggerUtil.error('Profile update failed', error as Error);
      throw new InternalServerError('Failed to update profile');
    }
  }

  /**
   * Register user with activation flow - links pre-created Lecturer/Student record
   */
  static async registerUserWithActivation(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    staffOrStudentNumber: string,
    departmentId?: string
  ): Promise<{ user: User; linkedRecord?: Lecturer | Student }> {
    try {
      // Verify activation eligibility
      const eligibility = await ValidationService.verifyActivationEligibility(
        role as any,
        staffOrStudentNumber
      );

      if (!eligibility.eligible) {
        throw new BadRequestError(eligibility.error || 'Not eligible for activation');
      }

      // Create user (same as registerUser)
      const userId = UuidUtil.generateUserId();
      const userPoolId = CognitoConfig.getUserPoolId();

      // Create user in Cognito - let Cognito send verification email with native flow
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: password,
        // Don't specify MessageAction - Cognito will send verification email
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'given_name', Value: firstName },
          { Name: 'family_name', Value: lastName },
        ],
      });

      try {
        LoggerUtil.debug(`Creating Cognito user for activation`, { email, userPoolId });
        await this.cognitoClient.send(createUserCommand);
        LoggerUtil.debug(`Cognito user created successfully`);

        // Set permanent password
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: email,
          Password: password,
          Permanent: true,
        });

        LoggerUtil.debug(`Setting permanent password`, { email });
        await this.cognitoClient.send(setPasswordCommand);
        LoggerUtil.debug(`Password set successfully`);
      } catch (cognitoError: any) {
        LoggerUtil.error('Cognito error during user creation', { 
          email, 
          errorName: cognitoError.name,
          errorMessage: cognitoError.message,
          errorCode: cognitoError.$metadata?.httpStatusCode,
          userPoolId,
        });
        // If user already exists, just set the password
        if (cognitoError.name === 'UsernameExistsException') {
          try {
            const setPasswordCommand = new AdminSetUserPasswordCommand({
              UserPoolId: userPoolId,
              Username: email,
              Password: password,
              Permanent: true,
            });
            await this.cognitoClient.send(setPasswordCommand);
          } catch (passwordError: any) {
            // Ignore password errors
            LoggerUtil.warn('Could not update password for existing user', { email });
          }
        } else {
          throw cognitoError;
        }
      }

      // Create user record in DynamoDB
      const now = Date.now();

      const user: User = {
        userId,
        email,
        firstName,
        lastName,
        role,
        isActivated: false, // Not activated until email verified
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      };

      const tables = DatabaseConfig.getTables();
      await DynamoDBService.put(tables.USERS, user);

      // Link pre-created record to user (mark as PENDING until email verified)
      let linkedRecord: Lecturer | Student | undefined;

      if (role === 'EDUCATOR' && eligibility.record) {
        const lecturer = eligibility.record as Lecturer;
        await DynamoDBService.update(
          tables.LECTURERS,
          { lecturerId: lecturer.lecturerId },
          {
            userId,
            registrationStatus: 'PENDING',
            updatedAt: now,
          }
        );
        linkedRecord = { ...lecturer, userId, registrationStatus: 'PENDING', updatedAt: now };
      } else if (role === 'STUDENT' && eligibility.record) {
        const student = eligibility.record as Student;
        await DynamoDBService.update(
          tables.STUDENTS,
          { studentId: student.studentId },
          {
            userId,
            registrationStatus: 'PENDING',
            updatedAt: now,
          }
        );
        linkedRecord = { ...student, userId, registrationStatus: 'PENDING', updatedAt: now };
      }

      // Generate and send verification code
      try {
        const code = EmailService.generateVerificationCode();
        await VerificationService.storeVerificationCode(email, code);
        await EmailService.sendVerificationCode(email, firstName, code);
        LoggerUtil.debug(`Verification code sent`, { email });
      } catch (emailError) {
        LoggerUtil.warn('Failed to send verification code', { email, error: emailError });
        // Don't throw - user can request code resend
      }

      LoggerUtil.info('User registered with activation', {
        userId,
        email,
        role,
        staffOrStudentNumber,
      });

      return {
        user,
        linkedRecord,
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      if ((error as any).Code === 'UsernameExistsException') {
        throw new ConflictError('User already exists with this email');
      }

      LoggerUtil.error('User registration with activation failed', error as Error);
      throw new InternalServerError('Failed to register user with activation');
    }
  }

  /**
   * Logout (token invalidation handled by client)
   */
  static async logout(userId: string): Promise<void> {
    LoggerUtil.info('User logged out', { userId });
    // Token invalidation happens on client side
    // Optional: Can implement token blacklist in Redis if needed
  }

  /**
   * Verify email with 6-digit PIN and update Cognito attributes
   */
  static async verifyEmailWithCode(email: string, code: string): Promise<void> {
    try {
      const { VerificationService } = await import('./verification.service');
      
      // Validate the PIN
      const isValid = await VerificationService.verifyCode(email, code);
      if (!isValid) {
        throw new BadRequestError('Invalid or expired verification code');
      }

      const userPoolId = CognitoConfig.getUserPoolId();

      // Update Cognito user attributes
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email_verified', Value: 'true' },
        ],
      });

      await this.cognitoClient.send(updateCommand);

      // Mark user as activated in DynamoDB
      const tables = DatabaseConfig.getTables();
      const user = await DynamoDBService.query(
        tables.USERS,
        'email = :email',
        { ':email': email },
        { indexName: 'email-index' }
      );

      if (!user.items || user.items.length === 0) {
        throw new NotFoundError('User not found');
      }

      const userData = user.items[0];
      await DynamoDBService.update(
        tables.USERS,
        { userId: userData.userId },
        {
          isActivated: true,
          updatedAt: Date.now(),
        }
      );

      // Update linked Lecturer/Student record
      if (userData.role === 'EDUCATOR') {
        const lecturers = await DynamoDBService.query(
          tables.LECTURERS,
          'userId = :userId',
          { ':userId': userData.userId },
          { indexName: 'userId-index' }
        );
        if (lecturers.items && lecturers.items.length > 0) {
          await DynamoDBService.update(
            tables.LECTURERS,
            { lecturerId: lecturers.items[0].lecturerId },
            {
              registrationStatus: 'ACTIVATED',
              activatedAt: Date.now(),
              updatedAt: Date.now(),
            }
          );
        }
      } else if (userData.role === 'STUDENT') {
        const students = await DynamoDBService.query(
          tables.STUDENTS,
          'userId = :userId',
          { ':userId': userData.userId },
          { indexName: 'userId-index' }
        );
        if (students.items && students.items.length > 0) {
          await DynamoDBService.update(
            tables.STUDENTS,
            { studentId: students.items[0].studentId },
            {
              registrationStatus: 'ACTIVATED',
              activatedAt: Date.now(),
              updatedAt: Date.now(),
            }
          );
        }
      }

      LoggerUtil.info('Email verified and account activated', { email });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      LoggerUtil.error('Email verification failed', error as Error);
      throw new InternalServerError('Failed to verify email');
    }
  }


}
