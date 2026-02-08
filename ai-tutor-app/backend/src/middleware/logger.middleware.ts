import { Request, Response, NextFunction } from 'express';
import { LoggerUtil } from '../utils/logger.util';
import { UuidUtil } from '../utils/uuid.util';

/**
 * Request/response logging middleware
 */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = UuidUtil.generate();
  LoggerUtil.setRequestId(requestId);

  const startTime = Date.now();
  const method = req.method;
  const path = req.path;

  LoggerUtil.info('Incoming request', {
    method,
    path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Intercept response end
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    LoggerUtil.info('Response sent', {
      method,
      path,
      statusCode,
      duration,
    });

    return originalSend.call(this, data);
  };

  next();
}
