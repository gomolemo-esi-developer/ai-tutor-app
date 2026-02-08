import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AuthService } from '../../services/auth.service';
import { ValidationService } from '../../services/validation.service';
import { registerSchema, updateProfileSchema, changePasswordSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { UnauthorizedError, BadRequestError, ValidationError, NotFoundError } from '../../utils/error.util';

/**
 * POST /auth/register - Register a new user
 */
export async function handleRegister(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    // Validate input
    const input = registerSchema.parse(body);

    // Register user (account is NOT activated until verified)
    const user = await AuthService.registerUser(
      input.email,
      input.password,
      input.firstName,
      input.lastName,
      input.role
    );

    LoggerUtil.info('User registered', { userId: user.userId });

    return ResponseUtil.lambdaResponse(
      201,
      ResponseUtil.success(
        {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        'User registered successfully. Please verify your email to continue.'
      )
    );
  });
}

/**
 * GET /auth/user - Get current user profile
 */
export async function handleGetUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getPathParam(event, 'userId');

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const user = await AuthService.getUserById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        bio: user.bio,
        profilePicture: user.profilePicture,
        phone: user.phone,
      })
    );
  });
}

/**
 * PUT /auth/profile - Update user profile
 */
export async function handleUpdateProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getPathParam(event, 'userId');
    const body = LambdaUtil.parseBody(event);

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    // Validate input
    const input = updateProfileSchema.parse(body);

    // Update profile
    const updated = await AuthService.updateProfile(userId, {
      firstName: input.firstName,
      lastName: input.lastName,
      bio: input.bio,
      phone: input.phone,
      profilePicture: input.profilePicture,
    });

    LoggerUtil.info('Profile updated', { userId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(
        {
          userId: updated.userId,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          bio: updated.bio,
          profilePicture: updated.profilePicture,
          phone: updated.phone,
        },
        'Profile updated successfully'
      )
    );
  });
}

/**
 * POST /auth/change-password - Change user password
 */
export async function handleChangePassword(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getPathParam(event, 'userId');
    const body = LambdaUtil.parseBody(event);

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    // Validate input
    const input = changePasswordSchema.parse(body);

    // Change password
    await AuthService.changePassword(userId, input.currentPassword, input.newPassword);

    LoggerUtil.info('Password changed', { userId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({}, 'Password changed successfully')
    );
  });
}
