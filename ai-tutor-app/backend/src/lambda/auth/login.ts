import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AuthService } from '../../services/auth.service';
import { loginSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError } from '../../utils/error.util';

/**
 * POST /auth/login - Authenticate user
 */
export async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    // Validate input
    const input = loginSchema.parse(body);

    // Login user
    const result = await AuthService.loginUser(input.email, input.password);

    LoggerUtil.info('User logged in', {
      userId: result.user.userId,
      email: result.user.email,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      })
    );
  });
}

/**
 * POST /auth/logout - Logout user (client-side token invalidation)
 */
export async function handleLogout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);
    const userId = body.userId;

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    // Logout (token invalidation handled by client)
    await AuthService.logout(userId);

    LoggerUtil.info('User logged out', { userId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({}, 'Logged out successfully')
    );
  });
}
