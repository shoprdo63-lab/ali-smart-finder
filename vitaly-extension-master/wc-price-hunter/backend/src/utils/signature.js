import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for AliExpress API
 */
export function generateSignature(params, appSecret) {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign')
    .sort();
  
  const queryString = sortedKeys
    .map(key => `${key}${params[key]}`)
    .join('');

  return crypto
    .createHmac('sha256', appSecret)
    .update(queryString)
    .digest('hex')
    .toUpperCase();
}

export default generateSignature;
