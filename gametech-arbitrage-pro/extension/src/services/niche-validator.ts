/**
 * Niche Validator - Client-side niche filtering
 * [cite: 2026-02-09, 2026-01-21] - Niche filtering requirements
 */

export interface ValidationResult {
  allowed: boolean;
  category?: string;
  reason?: string;
  confidence: number;
}

export class NicheValidator {
  // Approved tech categories with keywords
  private readonly techKeywords: Record<string, string[]> = {
    keyboard: ['keyboard', 'mechanical keyboard', 'gaming keyboard', 'keychron', 'logitech keyboard', 'razer keyboard'],
    mouse: ['mouse', 'gaming mouse', 'wireless mouse', 'logitech mouse', 'razer mouse', 'steelseries mouse'],
    monitor: ['monitor', 'gaming monitor', '4k monitor', '144hz', '240hz', 'ultrawide', 'curved monitor', 'display'],
    headphones: ['headphones', 'gaming headset', 'wireless headset', 'noise cancelling', 'airpods', 'sony wh', 'sennheiser'],
    microphone: ['microphone', 'gaming mic', 'usb microphone', 'blue yeti', 'rode', 'audio-technica'],
    webcam: ['webcam', 'streaming camera', 'logitech webcam', '4k webcam'],
    controller: ['controller', 'gamepad', 'xbox controller', 'ps5 controller', 'wireless controller'],
    'studio-gear': ['audio interface', 'mixer', 'midi controller', 'studio monitors', 'podcast equipment'],
    'pc-parts': ['graphics card', 'gpu', 'rtx', 'processor', 'cpu', 'ram', 'ssd', 'motherboard'],
    accessories: ['mouse pad', 'desk mat', 'cable', 'usb hub', 'dock', 'stand', 'mount'],
  };

  // Strict fashion/clothing blocklist
  private readonly blockedKeywords: string[] = [
    'clothing', 'shirt', 't-shirt', 'pants', 'jeans', 'dress', 'skirt',
    'jacket', 'sweater', 'hoodie', 'shoes', 'sneakers', 'boots', 'handbag',
    'jewelry', 'watch', 'fashion', 'apparel', 'makeup', 'cosmetic', 'perfume',
  ];

  /**
   * Validate if product is in approved niche
   */
  validate(title: string, category: string = ''): ValidationResult {
    const normalizedTitle = title.toLowerCase();
    const normalizedCategory = category.toLowerCase();
    
    // Check blocklist first
    for (const blocked of this.blockedKeywords) {
      if (normalizedTitle.includes(blocked) || normalizedCategory.includes(blocked)) {
        return {
          allowed: false,
          reason: `Fashion/Clothing item detected (${blocked})`,
          confidence: 1.0,
        };
      }
    }
    
    // Check tech categories
    for (const [cat, keywords] of Object.entries(this.techKeywords)) {
      let matchCount = 0;
      
      for (const keyword of keywords) {
        if (normalizedTitle.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        const confidence = Math.min(matchCount / 2, 1.0);
        return {
          allowed: true,
          category: cat,
          confidence,
        };
      }
    }
    
    // No match found
    return {
      allowed: false,
      reason: 'Product does not match Gaming & Tech Gadgets categories',
      confidence: 0,
    };
  }
}
