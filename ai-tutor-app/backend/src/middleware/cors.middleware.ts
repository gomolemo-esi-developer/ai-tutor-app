import { Request, Response, NextFunction } from 'express';
import { EnvConfig } from '../config/environment';

/**
 * CORS middleware
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const corsOrigin = EnvConfig.get('CORS_ORIGIN');
  const allowedOrigins = corsOrigin === '*' ? '*' : corsOrigin.split(',');

  const origin = req.headers.origin;

  // Check if origin is allowed
  if (corsOrigin !== '*' && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      error: 'CORS_ERROR',
      message: 'Origin not allowed',
      statusCode: 403,
    });
  }

  // Set CORS headers
  if (corsOrigin === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-File-ID, X-Module-Code, X-File-Name');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, X-File-ID, X-Module-Code');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}
