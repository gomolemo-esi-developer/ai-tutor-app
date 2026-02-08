import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ResponseUtil } from './response.util';
import { isAppError } from './error.util';
import { LoggerUtil } from './logger.util';
import { UuidUtil } from './uuid.util';

/**
 * Lambda utility for common handler operations
 */
export class LambdaUtil {
  /**
   * Parse and extract request body
   */
  static parseBody(event: APIGatewayProxyEvent): any {
    try {
      return event.body ? JSON.parse(event.body) : {};
    } catch {
      return {};
    }
  }

  /**
   * Extract path parameters
   */
  static getPathParam(event: APIGatewayProxyEvent, param: string): string | null {
    return event.pathParameters?.[param] || null;
  }

  /**
   * Extract query parameters
   */
  static getQueryParam(event: APIGatewayProxyEvent, param: string): string | null {
    return event.queryStringParameters?.[param] || null;
  }

  /**
   * Extract all query parameters
   */
  static getQueryParams(event: APIGatewayProxyEvent): Record<string, any> {
    return event.queryStringParameters || {};
  }

  /**
   * Extract user from authorization header
   */
  static extractUser(event: APIGatewayProxyEvent): {
    userId?: string;
    role?: string;
    email?: string;
  } {
    // In a real implementation, this would be set by API Gateway authorizer
    // For now, we return empty object - Phase 1 auth middleware handles this
    return {};
  }

  /**
   * Get user ID from request context (set by API Gateway authorizer)
   */
  static getUserId(event: APIGatewayProxyEvent): string {
    // API Gateway authorizer sets user ID in requestContext.authorizer.claims.sub
    const userId = event.requestContext?.authorizer?.claims?.sub;
    // Return user ID or generate a temporary one for local testing/development
    return userId || UuidUtil.generateWithPrefix('user');
  }

  /**
   * Get user role from request context
   */
  static getUserRole(event: APIGatewayProxyEvent): string {
    // API Gateway authorizer sets role in requestContext.authorizer.claims
    return event.requestContext?.authorizer?.claims?.['custom:role'] || 'STUDENT';
  }

  /**
   * Wrap async handler with error handling
   */
  static async wrap(handler: () => Promise<APIGatewayProxyResult>): Promise<APIGatewayProxyResult> {
    const requestId = UuidUtil.generate();
    LoggerUtil.setRequestId(requestId);

    try {
      return await handler();
    } catch (error) {
      LoggerUtil.error('Handler error', error as Error);

      if (isAppError(error)) {
        const { statusCode, code, message } = error;
        return ResponseUtil.lambdaResponse(
          statusCode,
          ResponseUtil.error(code, message, statusCode)
        );
      }

      return ResponseUtil.lambdaResponse(
        500,
        ResponseUtil.error('INTERNAL_ERROR', 'An unexpected error occurred', 500)
      );
    }
  }

  /**
   * Get pagination from query params
   */
  static getPagination(event: APIGatewayProxyEvent): { page: number; limit: number } {
    const page = parseInt(this.getQueryParam(event, 'page') || '1', 10);
    const limit = parseInt(this.getQueryParam(event, 'limit') || '10', 10);

    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    };
  }
}
