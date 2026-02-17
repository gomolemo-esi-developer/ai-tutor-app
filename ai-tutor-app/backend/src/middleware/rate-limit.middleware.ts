import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * General API rate limiter - 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict limiter for auth endpoints - 5 requests per 15 minutes per IP
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by email if available, otherwise by IP
    return (req.body?.email || req.ip || '') as string;
  },
});

/**
 * Strict limiter for AI/Chat endpoints - 30 requests per minute per user
 * Prevents abuse of expensive API calls
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many chat requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return ((req as any).userId || req.ip || '') as string;
  },
});

/**
 * Quiz limiter - 10 requests per minute per user
 */
export const quizLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many quiz requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return ((req as any).userId || req.ip || '') as string;
  },
});

/**
 * File upload limiter - 5 uploads per 10 minutes per user
 * Prevents storage quota abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return ((req as any).userId || req.ip || '') as string;
  },
});
