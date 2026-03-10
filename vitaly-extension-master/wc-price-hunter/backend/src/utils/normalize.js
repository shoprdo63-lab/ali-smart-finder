/**
 * Advanced product title normalization and model extraction
 * Removes noise, extracts key identifiers for accurate matching
 */

// Common stop words to remove
const STOP_WORDS = new Set([
  'the', 'and', 'or', 'for', 'with', 'from', 'by', 'at', 'in', 'on',
  'new', 'used', 'refurbished', 'renewed', 'certified', 'official',
  'pack', 'set', 'bundle', 'combo', 'piece', 'count', 'items',
  'amazon', 'choice', 'seller', 'rated', 'prime', 'exclusive', 'basic',
  'best', 'top', 'premium', 'pro', 'plus', 'max', 'ultra', 'elite'
]);

// Patterns to remove
const REMOVE_PATTERNS = [
  /\([^)]*\)/g,                    // Remove parentheses content
  /\[[^\]]*\]/g,                   // Remove brackets content
  /\d+\s*(?:pack|count|piece|set|bundle|items?)\b/gi,  // Pack quantities
  /\b(?:black|white|red|blue|green|gray|silver|gold)\b/gi,  // Colors
  /\b\d+(?:\.\d+)?\s*(?:inch|"|'|mm|cm|oz|lbs|kg|gb|tb|mb)\b/gi,  // Measurements
];

/**
 * Extract model numbers from title
 * Matches patterns like: ABC-123, XYZ123, A1234, etc.
 */
export function extractModelNumber(title) {
  const patterns = [
    /\b[A-Z]{2,}[-_]?[A-Z0-9]{4,}\b/gi,  // ABC-123456, ABCD1234
    /\b[A-Z]\d{3,}[A-Z0-9]*\b/gi,        // A123, B550X
    /\b\d{3,}[A-Z]{1,3}\b/gi,            // 3080Ti, 5600X
    /\b[A-Z]{1,3}\d{3,}\b/gi,            // MX500, WD40
  ];

  for (const pattern of patterns) {
    const matches = title.match(pattern);
    if (matches && matches.length > 0) {
      // Return longest match (most specific)
      return matches.reduce((a, b) => a.length > b.length ? a : b);
    }
  }

  return null;
}

/**
 * Extract brand from title
 */
export function extractBrand(title) {
  const knownBrands = [
    'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer',
    'Microsoft', 'Google', 'Amazon', 'Anker', 'Belkin', 'Logitech', 'Razer',
    'Canon', 'Nikon', 'Panasonic', 'GoPro', 'DJI', 'Bose', 'JBL', 'Sennheiser',
    'Nintendo', 'PlayStation', 'Xbox', 'Fitbit', 'Garmin', 'Xiaomi', 'Huawei',
    'OnePlus', 'COSORI', 'Instant Pot', 'Ninja', 'Cuisinart', 'KitchenAid',
    'Dyson', 'Shark', 'iRobot', 'Roomba', 'Philips', 'Braun'
  ];

  for (const brand of knownBrands) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(title)) {
      return brand;
    }
  }

  // Fallback: first capitalized word
  const words = title.split(/\s+/);
  for (const word of words) {
    if (word.length > 2 && /^[A-Z]/.test(word)) {
      return word;
    }
  }

  return null;
}

/**
 * Normalize title for comparison
 */
export function normalizeTitle(title) {
  if (!title) return '';

  let normalized = title.toLowerCase().trim();

  // Remove patterns
  for (const pattern of REMOVE_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  // Remove stop words
  const words = normalized.split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => !/^\d+$/.test(word));  // Remove pure numbers

  // Remove duplicates while preserving order
  const uniqueWords = [...new Set(words)];

  return uniqueWords.join(' ').trim();
}

/**
 * Extract key product identifiers
 */
export function extractIdentifiers(title) {
  return {
    brand: extractBrand(title),
    model: extractModelNumber(title),
    normalized: normalizeTitle(title),
    original: title
  };
}

/**
 * Generate search query from title
 * Returns most relevant terms for API search
 */
export function generateSearchQuery(title) {
  const identifiers = extractIdentifiers(title);
  
  // Priority: Brand + Model > Brand + first 3 words > first 4 words
  if (identifiers.brand && identifiers.model) {
    return `${identifiers.brand} ${identifiers.model}`;
  }

  if (identifiers.brand) {
    const words = identifiers.normalized.split(/\s+/).slice(0, 3);
    return `${identifiers.brand} ${words.join(' ')}`;
  }

  // Fallback: first 4 normalized words
  return identifiers.normalized.split(/\s+/).slice(0, 4).join(' ');
}

export default {
  extractModelNumber,
  extractBrand,
  normalizeTitle,
  extractIdentifiers,
  generateSearchQuery
};
