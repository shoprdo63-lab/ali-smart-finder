/**
 * Advanced Product Matching Algorithm
 * Multi-factor scoring with NLP, brand detection, and spec comparison
 */

class ProductMatcher {
  constructor() {
    this.weights = {
      textSimilarity: 0.35,
      specMatch: 0.30,
      brandMatch: 0.20,
      pricePlausibility: 0.10,
      sellerReliability: 0.05
    };
    
    this.stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'with', 'for', 'from', 'in', 'on', 'at', 'to',
      'new', 'original', 'official', 'authentic', 'genuine', 'brand', 'hot', 'sale',
      'generation', 'gen', 'model', 'version', 'ver', 'edition', 'series'
    ]);
    
    this.techKeywords = new Map([
      ['ram', ['ram', 'memory', 'ddr', 'ddr3', 'ddr4', 'ddr5']],
      ['storage', ['ssd', 'hdd', 'storage', 'nvme', 'emmc']],
      ['gpu', ['rtx', 'gtx', 'rx', 'graphics', 'gpu', 'video card']],
      ['cpu', ['i3', 'i5', 'i7', 'i9', 'ryzen', 'intel', 'amd', 'processor', 'cpu']],
      ['screen', ['oled', 'lcd', 'ips', 'retina', 'display', 'screen']],
      ['connection', ['wireless', 'bluetooth', 'wifi', 'usb-c', 'hdmi', 'wired']]
    ]);
  }

  /**
   * Main matching function
   * @param {Object} amazonProduct - Amazon product data
   * @param {Array} aliProducts - Array of AliExpress products
   * @returns {Array} Sorted matches with confidence scores
   */
  findMatches(amazonProduct, aliProducts) {
    const matches = aliProducts.map(aliProduct => {
      const scores = {
        textSimilarity: this.calculateTextSimilarity(amazonProduct.title, aliProduct.title),
        specMatch: this.compareSpecs(amazonProduct.specs, aliProduct.specs),
        brandMatch: this.checkBrandMatch(amazonProduct.title, aliProduct.title),
        pricePlausibility: this.validatePriceRatio(amazonProduct.price, aliProduct.price),
        sellerReliability: (aliProduct.seller?.rating || 4.0) / 5
      };
      
      const confidence = this.calculateWeightedScore(scores);
      
      return {
        product: aliProduct,
        confidence,
        scores,
        isMatch: confidence >= 0.80
      };
    });
    
    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }

  /**
   * Calculate cosine similarity between two titles
   */
  calculateTextSimilarity(title1, title2) {
    const tokens1 = this.tokenize(title1);
    const tokens2 = this.tokenize(title2);
    
    // Create term frequency vectors
    const vocab = new Set([...tokens1, ...tokens2]);
    const vec1 = this.createVector(tokens1, vocab);
    const vec2 = this.createVector(tokens2, vocab);
    
    return this.cosineSimilarity(vec1, vec2);
  }

  /**
   * Tokenize and normalize text
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 1 && !this.stopwords.has(word));
  }

  /**
   * Create frequency vector from tokens
   */
  createVector(tokens, vocab) {
    const freq = new Map();
    tokens.forEach(token => {
      freq.set(token, (freq.get(token) || 0) + 1);
    });
    
    return Array.from(vocab).map(term => freq.get(term) || 0);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    return dotProduct / (mag1 * mag2);
  }

  /**
   * Extract and compare product specifications
   */
  compareSpecs(specs1 = {}, specs2 = {}) {
    let matchCount = 0;
    let totalWeight = 0;
    
    const specWeights = {
      ram: 1.0,
      storage: 1.0,
      gpu: 0.9,
      cpu: 0.9,
      screen: 0.7,
      connection: 0.6
    };
    
    for (const [key, weight] of Object.entries(specWeights)) {
      totalWeight += weight;
      
      if (specs1[key] && specs2[key]) {
        if (this.normalizeSpec(key, specs1[key]) === this.normalizeSpec(key, specs2[key])) {
          matchCount += weight;
        }
      }
    }
    
    return totalWeight > 0 ? matchCount / totalWeight : 0.5;
  }

  /**
   * Normalize specification values for comparison
   */
  normalizeSpec(key, value) {
    const str = String(value).toLowerCase().trim();
    
    switch (key) {
      case 'ram':
      case 'storage':
        // Extract number and unit
        const match = str.match(/(\d+)\s*(gb|tb|mb)/i);
        return match ? `${match[1]}${match[2].toLowerCase()}` : str;
      
      case 'gpu':
        // Normalize GPU naming
        return str
          .replace(/\s+/g, '')
          .replace(/^(nvidia|amd)\s*/i, '');
      
      case 'cpu':
        // Normalize CPU naming
        return str
          .replace(/\s+/g, '-')
          .replace(/^intel\s*/i, '')
          .replace(/^amd\s*/i, '');
      
      default:
        return str;
    }
  }

  /**
   * Extract and compare brand names
   */
  checkBrandMatch(title1, title2) {
    const brand1 = this.extractBrand(title1);
    const brand2 = this.extractBrand(title2);
    
    if (!brand1 || !brand2) return 0.5; // Unknown brand
    if (brand1 === brand2) return 1.0;
    
    // Check for brand variations
    const variations = this.getBrandVariations(brand1);
    if (variations.includes(brand2)) return 0.9;
    
    return 0.3; // Different brands
  }

  /**
   * Extract brand from product title
   */
  extractBrand(title) {
    const commonBrands = [
      'razer', 'logitech', 'steelseries', 'corsair', 'hyperx', 'asus', 'msi',
      'gigabyte', 'evga', 'msi', 'amd', 'intel', 'nvidia', 'samsung', 'apple',
      'sony', 'microsoft', 'lenovo', 'dell', 'hp', 'acer', 'jbl', 'bose',
      'sennheiser', 'audio-technica', 'hyperx', 'roccat', 'benq', 'lg',
      'xiaomi', 'huawei', 'anker', 'tp-link', 'netgear', 'seagate', 'wd',
      'crucial', 'kingston', 'gskill', 'cooler master', 'nzxt', 'phanteks'
    ];
    
    const lowerTitle = title.toLowerCase();
    
    for (const brand of commonBrands) {
      if (lowerTitle.includes(brand)) {
        return brand;
      }
    }
    
    // Try to extract first word as potential brand
    const firstWord = lowerTitle.split(' ')[0];
    if (firstWord.length > 1 && !this.stopwords.has(firstWord)) {
      return firstWord;
    }
    
    return null;
  }

  /**
   * Get known brand variations
   */
  getBrandVariations(brand) {
    const variations = {
      'logitech': ['logi', 'logitech g', 'g pro'],
      'razer': ['razer inc', 'razer™'],
      'steelseries': ['steel series', 'ss'],
      'hyperx': ['hyper x', 'kingston hyperx'],
      'corsair': ['corsair gaming'],
      'asus': ['asus rog', 'rog'],
      'msi': ['msi gaming'],
      'samsung': ['samsung electronics'],
      'apple': ['apple inc', 'appl', 'iphone', 'macbook']
    };
    
    return variations[brand] || [];
  }

  /**
   * Validate if price ratio is reasonable
   */
  validatePriceRatio(amazonPrice, aliPrice) {
    if (!amazonPrice || !aliPrice) return 0.5;
    
    const ratio = aliPrice / amazonPrice;
    
    // Suspiciously cheap (<30% of Amazon price)
    if (ratio < 0.3) return 0.2;
    
    // Too expensive (>120% of Amazon price)
    if (ratio > 1.2) return 0.3;
    
    // Normal range (30-100%)
    if (ratio >= 0.3 && ratio <= 1.0) {
      // Ideal range: 40-80%
      if (ratio >= 0.4 && ratio <= 0.8) return 1.0;
      return 0.8;
    }
    
    // Slightly more expensive but still reasonable
    return 0.6;
  }

  /**
   * Calculate weighted confidence score
   */
  calculateWeightedScore(scores) {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [key, weight] of Object.entries(this.weights)) {
      totalScore += scores[key] * weight;
      totalWeight += weight;
    }
    
    return totalScore / totalWeight;
  }

  /**
   * Extract technical specs from product title
   */
  extractSpecsFromTitle(title) {
    const specs = {};
    const lowerTitle = title.toLowerCase();
    
    // RAM detection
    const ramMatch = lowerTitle.match(/(\d+)\s?gb\s?(ram|ddr)/i);
    if (ramMatch) {
      specs.ram = `${ramMatch[1]}GB`;
    }
    
    // Storage detection
    const storageMatch = lowerTitle.match(/(\d+)\s?(gb|tb)\s?(ssd|hdd|nvme|storage)/i);
    if (storageMatch) {
      specs.storage = `${storageMatch[1]}${storageMatch[2].toUpperCase()}`;
    }
    
    // GPU detection
    const gpuMatch = lowerTitle.match(/(rtx\s?\d{3,4}|gtx\s?\d{3,4}|rx\s?\d{3,4})/i);
    if (gpuMatch) {
      specs.gpu = gpuMatch[1].replace(/\s/g, '').toUpperCase();
    }
    
    // CPU detection
    const cpuMatch = lowerTitle.match(/(i[3579]-\d{4,5}[a-z]?|ryzen\s?\d\s?\d{4}[a-z]?)/i);
    if (cpuMatch) {
      specs.cpu = cpuMatch[1].replace(/\s/g, '').toLowerCase();
    }
    
    // Screen size detection
    const screenMatch = lowerTitle.match(/(\d{1,2}\.\d?)\s?(?:inch|"|in)/i);
    if (screenMatch) {
      specs.screen = `${screenMatch[1]}inch`;
    }
    
    // Connection type
    if (lowerTitle.includes('wireless') || lowerTitle.includes('bluetooth')) {
      specs.connection = 'wireless';
    } else if (lowerTitle.includes('wired') || lowerTitle.includes('usb')) {
      specs.connection = 'wired';
    }
    
    return specs;
  }
}

module.exports = ProductMatcher;
