import { Request, Response, NextFunction } from 'express';
import { isAppError, AppError } from '../utils/error.util';
import { LoggerUtil } from '../utils/logger.util';
import { ResponseUtil } from '../utils/response.util';

/**
 * Global error handling middleware
 */
export function errorMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
  LoggerUtil.error('Request error', error);

  if (isAppError(error)) {
    const { statusCode, code, message } = error;

    return ResponseUtil.lambdaResponse(
      statusCode,
      ResponseUtil.error(code, message, statusCode)
    );
  }

  // Handle unknown errors
  const statusCode = (error as any).statusCode || 500;
  const errorResponse = ResponseUtil.error(
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    statusCode
  );

  return ResponseUtil.lambdaResponse(statusCode, errorResponse);
}

/**
 * Async error wrapper for Express route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
