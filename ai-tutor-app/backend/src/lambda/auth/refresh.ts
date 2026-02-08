import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AuthService } from '../../services/auth.service';
import { refreshTokenSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';

/**
 * POST /auth/refresh - Refresh access token
 */
export async function handleRefresh(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    // Validate input
    const input = refreshTokenSchema.parse(body);

    // Refresh token
    const result = await AuthService.refreshToken(input.refreshToken);

    LoggerUtil.info('Token refreshed');

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    );
  });
}
