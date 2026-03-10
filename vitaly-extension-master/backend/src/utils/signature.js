import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for AliExpress API
 * @param {Object} params - API parameters
 * @param {string} appSecret - App secret key
 * @returns {string} - Hex signature
 */
function generateSignature(params, appSecret) {
  // Sort parameters alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // Build query string: key1value1key2value2...
  const queryString = sortedKeys
    .filter(key => key !== 'sign') // Exclude sign parameter
    .map(key => `${key}${params[key]}`)
    .join('');

  // Generate HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', appSecret)
    .update(queryString)
    .digest('hex')
    .toUpperCase();

  return signature;
}

export default generateSignature;
