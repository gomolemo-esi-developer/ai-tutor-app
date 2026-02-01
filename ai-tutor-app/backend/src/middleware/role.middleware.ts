/**
 * Role-Based Authorization Middleware
 * Validates that the authenticated user has one of the required roles
 *
 * Usage:
 *   app.get('/student/profile',
 *     authMiddleware,
 *     requireRole(['STUDENT']),
 *     handler
 *   );
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ResponseUtil } from '../utils/response.util';
import { LambdaUtil } from '../utils/lambda.util';

/**
 * Middleware factory that returns an async handler
 * Usage: requireRole(['STUDENT', 'ADMIN'])
 */
export function requireRole(allowedRoles: string[]) {
  return async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult | void> => {
    const userRole = LambdaUtil.getUserRole(event);

    if (!userRole) {
      return ResponseUtil.lambdaResponse(
        401,
        ResponseUtil.error(
          'UNAUTHORIZED',
          'User role not found in authentication token',
          401
        )
      );
    }

    if (!allowedRoles.includes(userRole)) {
      return ResponseUtil.lambdaResponse(
        403,
        ResponseUtil.error(
          'FORBIDDEN',
          `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`,
          403
        )
      );
    }

    // Authorization passed, proceed to next handler
    return undefined;
  };
}

/**
 * Middleware to check if user is authenticated
 * Usage: authMiddleware
 */
export async function authMiddleware(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult | void> {
  const userId = LambdaUtil.getUserId(event);

  if (!userId) {
    return ResponseUtil.lambdaResponse(
      401,
      ResponseUtil.error(
        'UNAUTHORIZED',
        'Authentication token is missing or invalid',
        401
      )
    );
  }

  // Authentication passed, proceed to next handler
  return undefined;
}
