import crypto from 'crypto';
import QRCode from 'qrcode';
import { DynamoDBService } from './dynamodb.service';
import { JwtUtil } from '../utils/jwt.util';
import { LoggerUtil } from '../utils/logger.util';
import { DatabaseConfig } from '../config/database.config';
import { EnvConfig } from '../config/environment';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../utils/error.util';
import { User } from '../models/types';

interface QuickLink {
  quickLinkId: string;
  tokenHash: string;
  email: string;
  userId: string;
  role: 'ADMIN' | 'EDUCATOR' | 'STUDENT';
  expiresAt: number;
  createdAt: number;
  usedAt?: number;
  used: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    type: 'existing-user' | 'demo-access';
    registrationNumber?: string;
  };
}

export class QuickBypassService {
  /**
    * Generate quick link for existing pre-registered Student/Lecturer/Admin
    * Looks up by studentNumber, staffNumber, or email (for admin)
    */
  static async generateQuickLinkForExisting(
    studentNumber?: string,
    staffNumber?: string,
    role?: 'STUDENT' | 'EDUCATOR' | 'ADMIN',
    email?: string
  ): Promise<{
    link: string;
    qrCode: string;
    expiresAt: number;
    expiresIn: string;
  }> {
    try {
      const tables = DatabaseConfig.getTables();

      // 1. Find Student, Lecturer, or Admin record
      let record: any;
      let recordTableName: string;
      let recordIdField: string;
      let isDirectUserLookup = false;

      if (role === 'ADMIN' && email) {
        // For admins, lookup directly in USERS table by email
        const query = await DynamoDBService.query(
          tables.USERS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );

        if (!query.items || query.items.length === 0) {
          throw new NotFoundError(`Admin user not found with email: ${email}`);
        }

        record = query.items[0];
        
        // Verify the user is actually an admin (ADMIN or super_admin)
        if (!['ADMIN', 'super_admin'].includes(record.role)) {
          throw new UnauthorizedError(`User with email ${email} is not an admin`);
        }

        isDirectUserLookup = true;
      } else if (role === 'STUDENT' && studentNumber) {
        const query = await DynamoDBService.query(
          tables.STUDENTS,
          'studentNumber = :num',
          { ':num': studentNumber },
          { indexName: 'studentNumber-index' }
        );

        if (!query.items || query.items.length === 0) {
          throw new NotFoundError(`Student not found with number: ${studentNumber}`);
        }

        record = query.items[0];
        recordTableName = tables.STUDENTS;
        recordIdField = 'studentId';
      } else if (role === 'EDUCATOR' && staffNumber) {
        const query = await DynamoDBService.query(
          tables.LECTURERS,
          'staffNumber = :num',
          { ':num': staffNumber },
          { indexName: 'staffNumber-index' }
        );

        if (!query.items || query.items.length === 0) {
          throw new NotFoundError(`Lecturer not found with number: ${staffNumber}`);
        }

        record = query.items[0];
        recordTableName = tables.LECTURERS;
        recordIdField = 'lecturerId';
      } else {
        throw new BadRequestError(
          'Invalid parameters. Provide studentNumber (STUDENT), staffNumber (EDUCATOR), or email (ADMIN) with matching role.'
        );
      }

      const adminEmail = record.email;
      let user: Partial<User>;

      // 2. Handle user lookup/creation based on role
      if (isDirectUserLookup) {
        // For admin, we already have the user record from USERS table
        user = record;

        // Ensure admin user is activated
        if (!user.isActivated) {
          await DynamoDBService.update(
            tables.USERS,
            { userId: user.userId },
            { isActivated: true, updatedAt: Date.now() }
          );

          LoggerUtil.info('Admin user activated via quick bypass', {
            userId: user.userId,
            email: user.email,
          });
        }
      } else {
        // For student/educator, check if User exists in USERS table
        let userQuery = await DynamoDBService.query(
          tables.USERS,
          'email = :email',
          { ':email': adminEmail },
          { indexName: 'email-index' }
        );

        if (!userQuery.items || userQuery.items.length === 0) {
          // Create new User
          const userId = this.generateUUID();
          user = {
            userId,
            email: adminEmail,
            firstName: record.firstName,
            lastName: record.lastName,
            role: role === 'STUDENT' ? 'STUDENT' : 'EDUCATOR',
            isActivated: true, // Auto-activate for quick bypass
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: 'quick-bypass-system',
          };

          await DynamoDBService.put(tables.USERS, user);

          // Link Student/Lecturer to User
          const updatePayload: any = {
            userId: user.userId,
            registrationStatus: 'ACTIVE',
            updatedAt: Date.now(),
          };

          await DynamoDBService.update(
            recordTableName,
            { [recordIdField]: record[recordIdField] },
            updatePayload
          );

          LoggerUtil.info('User created and linked via quick bypass', {
            userId: user.userId,
            email: adminEmail,
            role,
            [role === 'STUDENT' ? 'studentNumber' : 'staffNumber']:
              role === 'STUDENT' ? studentNumber : staffNumber,
          });
        } else {
          user = userQuery.items[0];

          // Ensure user is activated
          if (!user.isActivated) {
            await DynamoDBService.update(
              tables.USERS,
              { userId: user.userId },
              { isActivated: true, updatedAt: Date.now() }
            );

            LoggerUtil.info('User activated via quick bypass', {
              userId: user.userId,
              email: adminEmail,
            });
          }
        }
      }

      // 3. Generate raw token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // 4. Set expiration (15 minutes)
      const expiresAt = Date.now() + 15 * 60 * 1000;

      // 5. Store quick link record
      const quickLink: QuickLink = {
        quickLinkId: this.generateUUID(),
        tokenHash,
        email: user.email!,
        userId: user.userId!,
        role: user.role as 'STUDENT' | 'EDUCATOR' | 'ADMIN',
        expiresAt,
        createdAt: Date.now(),
        used: false,
        ipAddress: undefined,
        userAgent: undefined,
        metadata: {
          type: 'existing-user',
          registrationNumber: role === 'ADMIN' ? undefined : (studentNumber || staffNumber),
        },
      };

      await DynamoDBService.put(tables.QUICK_LINKS, quickLink);

      // 6. Build access link
      const frontendUrl = EnvConfig.get('FRONTEND_URL');
      const accessLink = `${frontendUrl}/auth/quick?token=${rawToken}&email=${encodeURIComponent(user.email!)}`;

      // 7. Generate QR code
      const qrCode = await QRCode.toDataURL(accessLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      const logMessage = role === 'ADMIN' ? 'Quick link generated for admin user' : 'Quick link generated for existing user';
      LoggerUtil.info(logMessage, {
        userId: user.userId,
        email: user.email,
        role,
        quickLinkId: quickLink.quickLinkId,
        expiresAt,
      });

      return {
        link: accessLink,
        qrCode,
        expiresAt,
        expiresIn: '15 minutes',
      };
    } catch (error) {
      LoggerUtil.error('Quick link generation failed', error);
      throw error;
    }
  }

  /**
   * Validate quick link token and generate JWT
   */
  static async validateQuickLink(
    rawToken: string,
    email: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    try {
      const tables = DatabaseConfig.getTables();

      // 1. Hash the provided token
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // 2. Query quick link by email and token hash
      const linkQuery = await DynamoDBService.query(
        tables.QUICK_LINKS,
        'email = :email AND tokenHash = :hash',
        { ':email': email, ':hash': tokenHash },
        { indexName: 'email-tokenHash-index' }
      );

      if (!linkQuery.items || linkQuery.items.length === 0) {
        throw new UnauthorizedError('Invalid quick link');
      }

      const quickLink = linkQuery.items[0];

      // 3. Verify not expired
      if (quickLink.expiresAt < Date.now()) {
        LoggerUtil.warn('Quick link expired', {
          email,
          quickLinkId: quickLink.quickLinkId,
          expiresAt: quickLink.expiresAt,
        });
        throw new UnauthorizedError('Quick link expired (15 minutes)');
      }

      // 4. Verify not already used
      if (quickLink.used) {
        LoggerUtil.warn('Quick link replay attempt detected', {
          email,
          quickLinkId: quickLink.quickLinkId,
          usedAt: quickLink.usedAt,
        });
        throw new UnauthorizedError('Quick link already used');
      }

      // 5. Mark as used atomically
      const now = Date.now();
      await DynamoDBService.update(
        tables.QUICK_LINKS,
        { quickLinkId: quickLink.quickLinkId },
        {
          used: true,
          usedAt: now,
        }
      );

      // 6. Get user from database
      const userQuery = await DynamoDBService.query(
        tables.USERS,
        'email = :email',
        { ':email': email },
        { indexName: 'email-index' }
      );

      if (!userQuery.items || userQuery.items.length === 0) {
        throw new NotFoundError('User not found');
      }

      const user = userQuery.items[0];

      // 7. Ensure user is activated
      if (!user.isActivated) {
        await DynamoDBService.update(
          tables.USERS,
          { userId: user.userId },
          {
            isActivated: true,
            lastLoginAt: now,
            updatedAt: now,
          }
        );
      } else {
        // Just update last login
        await DynamoDBService.update(
          tables.USERS,
          { userId: user.userId },
          {
            lastLoginAt: now,
            updatedAt: now,
          }
        );
      }

      // 8. Generate JWT tokens
      const tokens = JwtUtil.generateTokenPair({
        userId: user.userId,
        email: user.email,
        role: user.role,
      });

      LoggerUtil.info('Quick link used (FULL ACCESS)', {
        userId: user.userId,
        email,
        role: user.role,
        quickLinkId: quickLink.quickLinkId,
      });

      return {
         accessToken: tokens.accessToken,
         refreshToken: tokens.refreshToken,
         user: {
           userId: user.userId,
           email: user.email,
           firstName: user.firstName,
           lastName: user.lastName,
           role: user.role,
           profilePictureUrl: user.profilePictureUrl,
         },
       };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
        throw error;
      }
      LoggerUtil.error('Quick link validation failed', error);
      throw new UnauthorizedError('Failed to validate quick link');
    }
  }

  /**
   * Helper: Generate unique ID
   */
  private static generateUUID(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }
}
