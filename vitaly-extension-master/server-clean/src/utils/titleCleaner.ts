/**
 * AGGRESSIVE Amazon title cleaning utility
 * Extracts ONLY Brand + Model Number for precise AliExpress search
 */

export class TitleCleaner {
  // Known major brands to extract
  private static readonly KNOWN_BRANDS = [
    'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI',
    'Corsair', 'Logitech', 'Razer', 'SteelSeries', 'HyperX', 'Anker', 'Belkin',
    'TP-Link', 'Netgear', 'Linksys', 'D-Link', 'Google', 'Amazon', 'Microsoft',
    'Canon', 'Nikon', 'Fujifilm', 'Panasonic', 'GoPro', 'DJI', 'Bose', 'JBL',
    'Sennheiser', 'Audio-Technica', 'Shure', 'Yamaha', 'Roland', 'Korg',
    'Nintendo', 'PlayStation', 'Xbox', 'Valve', 'Oculus', 'HTC', 'Vive',
    'Fitbit', 'Garmin', 'Polar', 'Suunto', 'Xiaomi', 'Huawei', 'OnePlus',
    'COSORI', 'Instant Pot', 'Ninja', 'Cuisinart', 'KitchenAid', 'Breville',
    'Dyson', 'Shark', 'iRobot', 'Roomba', 'Eufy', 'Ecovacs', 'Roborock',
    'Philips', 'Braun', 'Oral-B', 'Waterpik', 'Sonicare', 'Remington',
    'Weber', 'Traeger', 'Blackstone', 'Coleman', 'Yeti', 'Stanley', 'Hydro Flask',
    'North Face', 'Patagonia', 'Columbia', 'REI', 'Osprey', 'Deuter',
    'GoPro', 'Insta360', 'Akaso', 'Apeman', 'Victure', 'Crosstour',
    'Cricut', 'Silhouette', 'Brother', 'Epson', 'Canon', 'HP',
  ];

  // Fluff words to aggressively remove
  private static readonly FLUFF_WORDS = new Set([
    'with', 'for', 'and', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'from', 'by',
    'electric', 'digital', 'wireless', 'portable', 'rechargeable', 'cordless',
    'stainless', 'steel', 'plastic', 'aluminum', 'metal', 'wood', 'glass',
    'black', 'white', 'red', 'blue', 'green', 'gray', 'silver', 'gold', 'rose',
    'matte', 'glossy', 'brushed', 'polished', 'satin', 'metallic',
    'new', 'used', 'refurbished', 'renewed', 'certified', 'official', 'original',
    'premium', 'pro', 'plus', 'max', 'ultra', 'elite', 'deluxe', 'advanced',
    'professional', 'commercial', 'industrial', 'heavy', 'duty', 'best', 'top',
    'pressure', 'technology', 'system', 'silent', 'eco', 'mode', 'smart',
    'pack', 'set', 'bundle', 'combo', 'kit', 'piece', 'count', 'items',
    'amazon', 'choice', 'seller', 'rated', 'prime', 'exclusive', 'basic',
    'warranty', 'guarantee', 'certified', 'tested', 'approved', 'verified',
    'international', 'global', 'worldwide', 'import', 'usa', 'us', 'uk', 'eu',
    'model', 'year', 'version', 'edition', 'release', 'generation', 'gen',
    'variable', 'temperature', 'control', 'interior', 'exterior', 'design',
    'gooseneck', 'kettle', 'cooker', 'maker', 'machine', 'device', 'tool',
  ]);

  /**
   * AGGRESSIVE: Extract ONLY Brand + Model Number from Amazon title
   */
  public static cleanTitle(title: string): string {
    if (!title || typeof title !== 'string') {
      return '';
    }

    console.log('\n🔥 ========== AGGRESSIVE TITLE CLEANING ==========');
    console.log('📥 Original title:', title);
    console.log('📏 Original length:', title.length, 'characters');

    // Step 1: Remove everything in parentheses and brackets
    let cleaned = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
    console.log('\n�️  Step 1: Removed brackets/parentheses');
    console.log('   Result:', cleaned);

    // Step 2: Extract Brand (first capitalized word or known brand)
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    let brand = '';
    
    // Check for known brands first
    for (const knownBrand of this.KNOWN_BRANDS) {
      const regex = new RegExp(`\\b${knownBrand}\\b`, 'i');
      if (regex.test(cleaned)) {
        brand = knownBrand;
        console.log('\n🏷️  Step 2: Found known brand:', brand);
        break;
      }
    }
    
    // If no known brand, take first capitalized word
    if (!brand && words.length > 0 && words[0]) {
      brand = words[0];
      console.log('\n🏷️  Step 2: Using first word as brand:', brand);
    }

    // Step 3: Extract Model Number (alphanumeric patterns)
    const modelPatterns = [
      /\b[A-Z]{2,}[-_]?[A-Z0-9]{4,}\b/gi,  // CRP-PHTR0609FS, B07GDFZ2JL
      /\b[A-Z]\d{2,}[A-Z0-9]*\b/gi,        // A15, B550, RTX3080
      /\b\d{3,}[A-Z]{1,3}\b/gi,            // 3080Ti, 5600X
      /\b[A-Z]{1,3}\d{3,}\b/gi,            // MX500, WD40
    ];
    
    let modelNumber = '';
    for (const pattern of modelPatterns) {
      const matches = cleaned.match(pattern);
      if (matches && matches.length > 0) {
        // Take the longest match (usually most specific)
        modelNumber = matches.reduce((a, b) => a.length > b.length ? a : b);
        console.log('\n🔧 Step 3: Extracted model number:', modelNumber);
        console.log('   Pattern matched:', pattern);
        break;
      }
    }

    // Step 4: Build final search query - ONLY Brand + Model
    let finalTitle = '';
    
    if (brand && modelNumber) {
      finalTitle = `${brand} ${modelNumber}`;
    } else if (brand) {
      // If no model number, take brand + first meaningful word
      const meaningfulWords = words
        .filter(w => w.length > 2)
        .filter(w => !this.FLUFF_WORDS.has(w.toLowerCase()))
        .filter(w => w !== brand)
        .slice(0, 2);
      
      finalTitle = [brand, ...meaningfulWords].join(' ');
    } else if (modelNumber) {
      finalTitle = modelNumber;
    } else {
      // Fallback: take first 2-3 meaningful words
      const meaningfulWords = words
        .filter(w => w.length > 2)
        .filter(w => !this.FLUFF_WORDS.has(w.toLowerCase()))
        .slice(0, 3);
      
      finalTitle = meaningfulWords.join(' ');
    }

    finalTitle = finalTitle.trim();
    
    console.log('\n✨ ========== CLEANING COMPLETE ==========');
    console.log('🎯 Final search query:', finalTitle);
    console.log('📏 Length reduction:', title.length, '→', finalTitle.length, 'characters');
    console.log('📊 Reduction:', Math.round((1 - finalTitle.length / title.length) * 100) + '%');
    console.log('🔥 ==========================================\n');

    return finalTitle;
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
