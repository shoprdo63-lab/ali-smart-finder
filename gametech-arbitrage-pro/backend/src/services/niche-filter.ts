/**
 * Niche Filter Service
 * Implements strict tech-only filtering with clothing/fashion blocking
 * [cite: 2026-02-09, 2026-01-21] - Niche filtering requirements
 */

export interface NicheValidationResult {
  allowed: boolean;
  reason?: string;
  detectedCategory?: string;
  confidence: number; // 0-1
}

export class NicheFilter {
  // Approved tech categories - must match these to activate
  private readonly techKeywords: Record<string, string[]> = {
    keyboard: ['keyboard', 'mechanical keyboard', 'gaming keyboard', 'wireless keyboard', 'rgb keyboard', 'keychron', 'logitech keyboard'],
    mouse: ['mouse', 'gaming mouse', 'wireless mouse', 'rgb mouse', 'logitech mouse', 'razer mouse', 'steelseries'],
    monitor: ['monitor', 'gaming monitor', '4k monitor', '144hz', '240hz', 'ultrawide', 'curved monitor', 'display'],
    headphones: ['headphones', 'gaming headset', 'wireless headset', 'noise cancelling', 'earbuds', 'airpods', 'sony wh'],
    microphone: ['microphone', 'gaming mic', 'condenser mic', 'usb microphone', 'blue yeti', 'audio technica'],
    webcam: ['webcam', 'gaming webcam', 'streaming camera', 'logitech webcam', '4k webcam'],
    controller: ['controller', 'gamepad', 'xbox controller', 'ps5 controller', 'wireless controller', 'steam deck'],
    'studio-gear': ['audio interface', 'mixer', 'midi controller', 'studio monitors', 'audio mixer', 'podcast equipment'],
    'pc-parts': ['gpu', 'graphics card', 'rtx', 'processor', 'cpu', 'ram', 'ssd', 'motherboard', 'power supply'],
    accessories: ['mouse pad', 'desk mat', 'cable', 'usb hub', 'dock', 'stand', 'mount', 'arm'],
  };

  // Strict blocklist - if ANY of these are found, reject immediately
  private readonly fashionKeywords: string[] = [
    'clothing', 'shirt', 't-shirt', 'pants', 'jeans', 'shorts', 'dress', 'skirt',
    'jacket', 'coat', 'sweater', 'hoodie', 'suit', 'blazer', 'formal wear',
    'shoes', 'sneakers', 'boots', 'sandals', 'heels', 'footwear',
    'bag', 'handbag', 'purse', 'backpack fashion', 'tote bag',
    'jewelry', 'watch fashion', 'necklace', 'bracelet', 'earrings', 'ring',
    'fashion', 'apparel', 'garment', 'textile', 'fabric', 'cotton', 'wool',
    'leather', 'silk', 'denim', 'activewear', 'sportswear', 'loungewear',
    'accessories fashion', 'belt', 'scarf', 'hat', 'cap', 'gloves fashion',
    'underwear', 'lingerie', 'socks', 'stockings', 'tights',
    'costume', 'cosplay outfit', 'uniform fashion',
    'makeup', 'cosmetic', 'beauty product', 'skincare',
    'perfume', 'fragrance', 'cologne',
  ];

  // Additional context keywords to boost confidence
  private readonly brandIndicators: string[] = [
    'logitech', 'razer', 'steelseries', 'corsair', 'hyperx', 'asus', 'msi',
    'lg', 'samsung', 'dell', 'benq', 'acer', 'aoc', 'viewsonic',
    'sony', 'audio-technica', 'sennheiser', 'beyerdynamic', 'rode',
    'elgato', 'focusrite', 'presonus', 'universal audio',
    'nvidia', 'amd', 'intel', 'gigabyte', 'evga',
  ];

  /**
   * Validate if a product is in the approved tech niche
   * Returns rejection if any fashion keywords detected
   */
  validateProduct(title: string, category: string = ''): NicheValidationResult {
    const normalizedTitle = title.toLowerCase();
    const normalizedCategory = category.toLowerCase();
    
    // Step 1: Check strict blocklist (100% rejection)
    for (const blockedWord of this.fashionKeywords) {
      if (normalizedTitle.includes(blockedWord) || normalizedCategory.includes(blockedWord)) {
        return {
          allowed: false,
          reason: `Blocked: Fashion/Clothing keyword detected (${blockedWord})`,
          detectedCategory: 'fashion-clothing',
          confidence: 1.0,
        };
      }
    }
    
    // Step 2: Check approved tech categories
    let bestMatch: { category: string; confidence: number } | null = null;
    
    for (const [categoryName, keywords] of Object.entries(this.techKeywords)) {
      let matchCount = 0;
      let totalWeight = 0;
      
      for (const keyword of keywords) {
        if (normalizedTitle.includes(keyword.toLowerCase())) {
          matchCount++;
          // Higher weight for multi-word matches
          totalWeight += keyword.split(' ').length;
        }
      }
      
      if (matchCount > 0) {
        const confidence = Math.min(totalWeight / 3, 1.0); // Cap at 1.0
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { category: categoryName, confidence };
        }
      }
    }
    
    // Step 3: Check brand indicators for additional confidence
    if (bestMatch) {
      for (const brand of this.brandIndicators) {
        if (normalizedTitle.includes(brand.toLowerCase())) {
          bestMatch.confidence = Math.min(bestMatch.confidence + 0.1, 1.0);
          break;
        }
      }
    }
    
    // Step 4: Return result
    if (bestMatch && bestMatch.confidence >= 0.3) {
      return {
        allowed: true,
        detectedCategory: bestMatch.category,
        confidence: bestMatch.confidence,
      };
    }
    
    // No clear tech category detected
    return {
      allowed: false,
      reason: 'Product does not match approved tech categories (Gaming & Tech Gadgets only)',
      confidence: bestMatch?.confidence || 0,
    };
  }

  /**
   * Batch validate multiple products
   */
  batchValidate(products: Array<{ title: string; category?: string }>): NicheValidationResult[] {
    return products.map(p => this.validateProduct(p.title, p.category));
  }

  /**
   * Get list of approved categories
   */
  getApprovedCategories(): string[] {
    return Object.keys(this.techKeywords);
  }

  /**
   * Get blocked categories (for logging/debugging)
   */
  getBlockedCategories(): string[] {
    return [...this.fashionKeywords];
  }
}
