/**
 * Amazon Product Service
 * Fetches product data from Amazon
 */
export default class AmazonService {
  constructor() {
    this.baseUrl = 'https://www.amazon.com';
    this.referralFees = {
      'electronics': 0.08,      // 8% for electronics
      'computers': 0.06,        // 6% for computers
      'office-products': 0.15,  // 15% for office products
      'default': 0.15          // 15% default
    };
  }

  /**
   * Get Amazon product by ASIN or title
   */
  async getProduct(asin, title) {
    try {
      // In production, this would scrape Amazon or use Amazon Product Advertising API
      // For demo, return structured mock data that simulates real product info
      
      if (asin) {
        return this.generateMockProduct(asin, title);
      }

      // Search by title (simplified)
      const mockAsin = 'B' + Math.random().toString(36).substring(2, 12).toUpperCase();
      return this.generateMockProduct(mockAsin, title);

    } catch (error) {
      console.error('Amazon Service Error:', error);
      return null;
    }
  }

  /**
   * Calculate Amazon referral fee
   */
  calculateReferralFee(price, category = 'default') {
    const feeRate = this.referralFees[category] || this.referralFees.default;
    return price * feeRate;
  }

  /**
   * Generate realistic mock product for testing
   */
  generateMockProduct(asin, title) {
    const categories = ['electronics', 'computers', 'office-products'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    // Generate realistic price between $15-$150
    const basePrice = Math.floor(Math.random() * 135) + 15;
    
    return {
      asin: asin || 'B08N5WRWNW',
      title: title || 'Wireless Ergonomic Mouse - Rechargeable 2.4GHz USB Optical Mouse',
      price: basePrice,
      currency: 'USD',
      category: category,
      rating: (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5-5.0
      reviews: Math.floor(Math.random() * 5000) + 100,
      availability: 'In Stock',
      prime: true,
      images: [
        `https://m.media-amazon.com/images/I/71${Math.random().toString(36).substring(2, 8).toUpperCase()}.jpg`
      ],
      referralFee: this.calculateReferralFee(basePrice, category),
      referralFeeRate: this.referralFees[category]
    };
  }

  /**
   * Extract product info from Amazon page HTML (for extension)
   */
  extractFromPage(document) {
    try {
      const titleEl = document.querySelector('#productTitle');
      const priceEl = document.querySelector('.a-price .a-offscreen, .a-price-whole');
      const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
      
      return {
        title: titleEl?.textContent?.trim(),
        price: this.parsePrice(priceEl?.textContent),
        asin: asinMatch?.[1],
        url: window.location.href
      };
    } catch (error) {
      console.error('Extract Error:', error);
      return null;
    }
  }

  parsePrice(priceText) {
    if (!priceText) return 0;
    const match = priceText.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(',', '')) : 0;
  }
}
