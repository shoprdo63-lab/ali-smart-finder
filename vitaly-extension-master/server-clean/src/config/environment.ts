import dotenv from 'dotenv';
import { EnvironmentConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * Validate and export environment configuration
 */
export const config: EnvironmentConfig = {
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  PORT: parseInt(process.env['PORT'] || '3001', 10),
  ALI_APP_KEY: process.env['ALI_APP_KEY'] || '',
  ALI_APP_SECRET: process.env['ALI_APP_SECRET'] || '',
  ALI_TRACKING_ID: process.env['ALI_TRACKING_ID'] || '',
  CACHE_TTL: parseInt(process.env['CACHE_TTL'] || '900', 10), // 15 minutes
  RATE_LIMIT_WINDOW: parseInt(process.env['RATE_LIMIT_WINDOW'] || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env['RATE_LIMIT_MAX'] || '100', 10),
};

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  const requiredVars = ['ALI_APP_KEY', 'ALI_APP_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (config.NODE_ENV === 'production' && !config.ALI_TRACKING_ID) {
    console.warn('⚠️  WARNING: ALI_TRACKING_ID not set in production mode');
  }

  // Validate numeric values
  if (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    throw new Error('Invalid PORT value');
  }

  if (isNaN(config.CACHE_TTL) || config.CACHE_TTL < 0) {
    throw new Error('Invalid CACHE_TTL value');
  }

  if (isNaN(config.RATE_LIMIT_WINDOW) || config.RATE_LIMIT_WINDOW < 0) {
    throw new Error('Invalid RATE_LIMIT_WINDOW value');
  }

  if (isNaN(config.RATE_LIMIT_MAX) || config.RATE_LIMIT_MAX < 1) {
    throw new Error('Invalid RATE_LIMIT_MAX value');
  }
}

/**
 * Log configuration (without sensitive data)
 */
export function logConfiguration(): void {
  console.log('🔧 Environment Configuration:');
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   PORT: ${config.PORT}`);
  console.log(`   ALI_APP_KEY: ${config.ALI_APP_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   ALI_APP_SECRET: ${config.ALI_APP_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`   ALI_TRACKING_ID: ${config.ALI_TRACKING_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`   CACHE_TTL: ${config.CACHE_TTL} seconds`);
  console.log(`   RATE_LIMIT_WINDOW: ${config.RATE_LIMIT_WINDOW}ms`);
  console.log(`   RATE_LIMIT_MAX: ${config.RATE_LIMIT_MAX} requests`);
}
