import rateLimit from 'express-rate-limit';
import { RateLimitError } from './errorHandler';

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        message: options.message || 'Too many requests, please try again later',
        code: 'RATE_LIMIT',
      },
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req, res, next) => {
      next(new RateLimitError(options.message || 'Rate limit exceeded'));
    },
  });
}

/**
 * General API rate limiter
 */
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later',
});

/**
 * Search endpoint rate limiter (more restrictive)
 */
export const searchLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 searches per minute
  message: 'Too many search requests, please try again later',
});

/**
 * Admin endpoints rate limiter
 */
export const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 admin requests per windowMs
  message: 'Too many admin requests, please try again later',
});
