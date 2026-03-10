import type { Request, Response, NextFunction } from 'express';

/**
 * Security middleware
 * Implements additional security checks and sanitization
 * [cite: 2026-02-26] - Security requirements
 */
export const securityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/json')) {
      res.status(415).json({
        success: false,
        error: 'Unsupported Media Type. Use application/json',
      });
      return;
    }
  }
  
  next();
};

/**
 * API Key authentication middleware for premium endpoints
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.get('X-API-Key') || req.query.apiKey;
  const validKey = process.env.API_KEY;
  
  // Skip in development mode
  if (process.env.NODE_ENV === 'development') {
    next();
    return;
  }
  
  if (!validKey) {
    logger.warn('API_KEY not configured');
    next();
    return;
  }
  
  if (!apiKey || apiKey !== validKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid or missing API key',
    });
    return;
  }
  
  next();
};

import { logger } from '../utils/logger.js';
