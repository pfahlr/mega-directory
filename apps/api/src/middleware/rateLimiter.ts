import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limiter configuration for different route types
 */

// Strict rate limiter for authentication endpoints (to prevent brute force attacks)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '5', 10), // 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 900)
    });
  }
});

// Standard rate limiter for admin API endpoints
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.ADMIN_RATE_LIMIT_MAX ?? '100', 10), // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 900)
    });
  }
});

// Lenient rate limiter for public API endpoints
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.PUBLIC_RATE_LIMIT_MAX ?? '300', 10), // 300 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 900)
    });
  }
});

// Moderate rate limiter for crawler API endpoints (more restrictive than public)
export const crawlerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.CRAWLER_RATE_LIMIT_MAX ?? '50', 10), // 50 requests per windowMs
  message: 'Too many crawler requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many crawler requests, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 900)
    });
  }
});

// Global rate limiter as a catch-all (very lenient)
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.GLOBAL_RATE_LIMIT_MAX ?? '1000', 10), // 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please slow down',
      retryAfter: Math.ceil(req.rateLimit.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 900)
    });
  }
});
