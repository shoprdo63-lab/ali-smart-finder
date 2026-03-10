/**
 * Signature generation utility for AliExpress API
 * Generates SHA256 signature for API requests
 */

import crypto from 'crypto';

/**
 * Generate signature for AliExpress API
 * @param params - API parameters
 * @param appSecret - Application secret key
 * @returns Generated signature
 */
export default function generateSignature(
  params: Record<string, string>,
  appSecret: string
): string {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // Build string to sign
  let stringToSign = appSecret;
  for (const key of sortedKeys) {
    stringToSign += key + params[key];
  }
  stringToSign += appSecret;
  
  // Generate SHA256 hash
  return crypto
    .createHash('sha256')
    .update(stringToSign)
    .digest('hex')
    .toUpperCase();
}

/**
 * Alternative HMAC signature method
 * @param message - Message to sign
 * @param secret - Secret key
 * @returns HMAC signature
 */
export function generateHmacSignature(message: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')
    .toUpperCase();
}
