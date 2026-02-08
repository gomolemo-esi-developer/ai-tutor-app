import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/error.util';
import { LoggerUtil } from '../utils/logger.util';

/**
 * Middleware to validate request body, query, or params against a Zod schema
 */
export function validateRequest(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source];

      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const details = formatValidationErrors(result.error);

        LoggerUtil.warn('Validation failed', {
          source,
          details,
        });

        throw new ValidationError('Validation failed', details);
      }

      // Replace the source data with validated data
      req[source] = result.data;

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(422).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 422,
          details: error.details,
        });
      }

      LoggerUtil.error('Validation middleware error', error as Error);

      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Validation error',
        statusCode: 500,
      });
    }
  };
}

/**
 * Format Zod validation errors into a readable object
 */
function formatValidationErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(err.message);
  });

  return details;
}
