import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { UnauthorizedError, ForbiddenError } from '../utils/error.util';
import { UuidUtil } from '../utils/uuid.util';
import { LoggerUtil } from '../utils/logger.util';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: 'ADMIN' | 'EDUCATOR' | 'STUDENT';
  email?: string;
  requestId: string;
}

/**
 * Middleware to verify JWT token and attach user context
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const requestId = UuidUtil.generate();
  req.requestId = requestId;
  LoggerUtil.setRequestId(requestId);

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = JwtUtil.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    const payload = JwtUtil.verifyToken(token);

    req.userId = payload.userId;
    req.role = payload.role;
    req.email = payload.email;

    LoggerUtil.info('User authenticated', {
      userId: req.userId,
      role: req.role,
    });

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: error.message,
        statusCode: 401,
      });
    }

    LoggerUtil.error('Authentication failed', error as Error);

    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
      statusCode: 401,
    });
  }
}

/**
 * Middleware to verify user has required role
 */
export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      throw new ForbiddenError('Insufficient permissions for this action');
    }

    next();
  };
}

/**
 * Middleware for optional authentication
 */
export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Not authenticated, but that's okay
    req.requestId = UuidUtil.generate();
    LoggerUtil.setRequestId(req.requestId);
    return next();
  }

  try {
    const token = JwtUtil.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = JwtUtil.verifyToken(token);
      req.userId = payload.userId;
      req.role = payload.role;
      req.email = payload.email;

      LoggerUtil.info('User authenticated', {
        userId: req.userId,
        role: req.role,
      });
    }
  } catch (error) {
    LoggerUtil.warn('Optional auth failed, continuing without auth', {
      error: (error as Error).message,
    });
  }

  req.requestId = UuidUtil.generate();
  LoggerUtil.setRequestId(req.requestId);
  next();
}
