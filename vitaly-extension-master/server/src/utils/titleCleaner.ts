/**
 * Professional Amazon title cleaning utility
 * Removes unnecessary characters and optimizes for AliExpress search
 */

export class TitleCleaner {
  private static readonly REMOVE_PATTERNS = [
    // Brand/model patterns
    /\b\d{4}\s*(Model|Year)\b/gi,
    /\b(?:New|Renewed|Refurbished|Used|Open-Box)\b/gi,
    /\b(?:International|Version|Edition|Variant)\b/gi,
    
    // Technical specifications
    /\b\d+\s*(?:GB|TB|MB|KB|Hz|GHz|MHz|W|V|A|mAh)\b/gi,
    /\b\d+(?:\.\d+)?\s*(?:inch|\"|'|mm|cm)\b/gi,
    /\b(?:WiFi|Bluetooth|USB|HDMI|Display|Screen|Resolution)\b/gi,
    
    // Marketing terms
    /\b(?:Best|Top|Premium|Pro|Plus|Max|Ultra|Elite|Gold|Silver|Platinum)\b/gi,
    /\b(?:Limited|Special|Exclusive|Official|Original|Authentic|Genuine)\b/gi,
    
    // Condition and warranty
    /\b(?:Warranty|Guarantee|Certified|Tested|Checked|Verified)\b/gi,
    /\b(?:Factory|Manufacturer|OEM|ODM)\b/gi,
    
    // Colors and variants
    /\b(?:Black|White|Red|Blue|Green|Yellow|Pink|Purple|Orange|Gray|Silver|Gold)\b/gi,
    /\b(?:Matte|Glossy|Metallic|Brushed|Polished)\b/gi,
    
    // Packaging
    /\b(?:Bundle|Pack|Set|Kit|Combo|Package|Box|Retail)\b/gi,
    
    // Geographic/Regional
    /\b(?:USA|US|EU|UK|International|Global|Worldwide)\b/gi,
    
    // Numbers and codes (keep ASIN)
    /\b(?:SKU|MPN|UPC|EAN|ISBN|Part\s*Number)\s*[:\-]?\s*\w+/gi,
    /\b[A-Z]{2,4}\d{6,10}\b/g, // Remove random alphanumeric codes except ASIN
    
    // Parenthetical content (usually specifications)
    /\([^)]*\)/g,
    /\[[^\]]*\]/g,
  ];

  private static readonly CLEAN_PATTERNS = [
    // Multiple spaces
    /\s+/g,
    // Special characters at ends
    /^[^\w\s]+|[^\w\s]+$/g,
    // Multiple hyphens
    /-+/g,
  ];

  private static readonly STOP_WORDS = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been',
    'a', 'an', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'you', 'your', 'we', 'our',
    'can', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'need', 'want', 'like', 'just',
    'only', 'also', 'even', 'more', 'most', 'very', 'really', 'actually', 'basically', 'essentially',
  ]);

  /**
   * Clean Amazon title for optimal AliExpress search
   */
  public static cleanTitle(title: string): string {
    if (!title || typeof title !== 'string') {
      return '';
    }

    let cleaned = title.trim();

    // Remove patterns that don't help with search
    for (const pattern of this.REMOVE_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Clean up formatting
    for (const pattern of this.CLEAN_PATTERNS) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    // Remove stop words and very short words
    const words = cleaned
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .filter(word => !this.STOP_WORDS.has(word.toLowerCase()))
      .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

    // Reconstruct cleaned title
    cleaned = words.join(' ').trim();

    // Limit length for optimal search
    if (cleaned.length > 80) {
      cleaned = cleaned.substring(0, 80).trim();
    }

    return cleaned;
  }

  /**
   * Extract key product terms for search
   */
  public static extractKeyTerms(title: string): string[] {
    const cleaned = this.cleanTitle(title);
    return cleaned
      .split(/\s+/)
      .filter(word => word.length >= 3)
      .slice(0, 8); // Top 8 key terms
  }

  /**
   * Generate multiple search variations
   */
  public static generateSearchVariations(title: string): string[] {
    const cleaned = this.cleanTitle(title);
    const keyTerms = this.extractKeyTerms(title);
    
    const variations: string[] = [cleaned];

    // Add variations with different term combinations
    if (keyTerms.length >= 4) {
      // First 4 terms
      variations.push(keyTerms.slice(0, 4).join(' '));
      
      // Middle terms
      variations.push(keyTerms.slice(2, 6).join(' '));
      
      // Last 4 terms
      variations.push(keyTerms.slice(-4).join(' '));
    }

    // Add variation with brand + main product type
    if (keyTerms.length >= 2) {
      variations.push(`${keyTerms[0]} ${keyTerms[1]}`);
    }

    // Remove duplicates and empty strings
    return [...new Set(variations.filter(v => v && v.length >= 10))];
  }

  /**
   * Validate if title is worth searching
   */
  public static isValidSearchTitle(title: string): boolean {
    const cleaned = this.cleanTitle(title);
    return cleaned.length >= 10 && cleaned.split(/\s+/).length >= 2;
  }
}
