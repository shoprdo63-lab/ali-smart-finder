/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy string matching in product comparison
 */
export function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
export function similarityScore(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLen);
}

/**
 * Calculate token-based Jaccard similarity
 */
export function jaccardSimilarity(str1, str2) {
  const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.size / union.size;
}

/**
 * Combined similarity score using multiple algorithms
 */
export function combinedSimilarity(str1, str2) {
  const levenshtein = similarityScore(str1, str2);
  const jaccard = jaccardSimilarity(str1, str2);
  
  // Weighted average: 60% Levenshtein, 40% Jaccard
  return (levenshtein * 0.6) + (jaccard * 0.4);
}

export default {
  levenshteinDistance,
  similarityScore,
  jaccardSimilarity,
  combinedSimilarity
};
