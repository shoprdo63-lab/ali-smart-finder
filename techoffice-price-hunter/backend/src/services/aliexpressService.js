/**
 * AliExpress Product Service
 * Fetches product data and stock availability from AliExpress
 */
export default class AliExpressService {
  constructor() {
    this.baseUrl = 'https://www.aliexpress.com';
    this.affiliateKey = 'ali_smart_finder_v1';
  }

  /**
   * Search for products on AliExpress
   */
  async searchProducts(query, options = {}) {
    const { maxResults = 10, category = 'tech-office' } = options;
    
    try {
      // In production, this would use AliExpress API or web scraping
      // For demo, generate realistic mock results
      
      const results = [];
      const count = Math.min(maxResults, 10);
      
      for (let i = 0; i < count; i++) {
        results.push(this.generateMockProduct(query, i));
      }
      
      return results.sort((a, b) => a.salePrice - b.salePrice);
      
    } catch (error) {
      console.error('AliExpress Search Error:', error);
      return [];
    }
  }

  /**
   * Search for a single best matching product
   */
  async searchProduct(query, category) {
    const results = await this.searchProducts(query, { maxResults: 5, category });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get detailed product information
   */
  async getProductDetails(productId, url) {
    try {
      // Mock detailed product data
      return {
        productId: productId || this.generateProductId(),
        title: 'Professional Wireless Ergonomic Mouse - USB-C Rechargeable',
        salePrice: Math.floor(Math.random() * 30) + 12, // $12-42
        originalPrice: Math.floor(Math.random() * 20) + 40,
        currency: 'USD',
        discount: Math.floor(Math.random() * 30) + 10,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        orders: Math.floor(Math.random() * 10000) + 500,
        images: this.generateImageList(5),
        shipping: {
          free: true,
          time: '15-30 days',
          cost: 0
        },
        seller: {
          name: 'TechGear Store',
          rating: 97.5,
          followers: Math.floor(Math.random() * 50000) + 1000
        },
        specifications: {
          'Connectivity': '2.4GHz Wireless + Bluetooth',
          'Battery': 'Rechargeable 500mAh',
          'DPI': '800-1600',
          'Compatibility': 'Windows, Mac, Linux'
        }
      };
    } catch (error) {
      console.error('Product Details Error:', error);
      return null;
    }
  }

  /**
   * Check stock availability
   */
  async checkStock(productId) {
    try {
      // Mock stock data - in production this would check AliExpress API
      const stockLevels = ['high', 'medium', 'low', 'limited'];
      const level = stockLevels[Math.floor(Math.random() * stockLevels.length)];
      
      const quantities = {
        high: Math.floor(Math.random() * 500) + 500,
        medium: Math.floor(Math.random() * 200) + 100,
        low: Math.floor(Math.random() * 50) + 10,
        limited: Math.floor(Math.random() * 10) + 1
      };

      return {
        available: true,
        level: level,
        quantity: quantities[level],
        estimatedDelivery: '15-30 days',
        warehouses: ['CN', 'US', 'EU'],
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Stock Check Error:', error);
      return {
        available: false,
        level: 'unknown',
        quantity: 0,
        error: error.message
      };
    }
  }

  /**
   * Generate mock product for testing
   */
  generateMockProduct(query, index) {
    const productId = this.generateProductId();
    const salePrice = Math.floor(Math.random() * 25) + 8; // $8-33
    const originalPrice = salePrice + Math.floor(Math.random() * 20) + 5;
    
    return {
      productId: productId,
      title: `${this.capitalize(query)} - ${this.getVariantName(index)}`,
      salePrice: salePrice,
      originalPrice: originalPrice,
      currency: 'USD',
      discount: Math.round(((originalPrice - salePrice) / originalPrice) * 100),
      rating: (Math.random() * 1.5 + 3.5).toFixed(1),
      orders: Math.floor(Math.random() * 5000) + 100,
      imageUrl: `https://ae01.alicdn.com/kf/H${Math.random().toString(36).substring(2, 14).toUpperCase()}.jpg`,
      productUrl: `${this.baseUrl}/item/${productId}.html`,
      affiliateUrl: this.buildAffiliateUrl(productId),
      shipping: {
        free: salePrice > 15,
        cost: salePrice > 15 ? 0 : 2.99
      },
      seller: {
        name: `Store${Math.floor(Math.random() * 999) + 1}`,
        rating: (90 + Math.random() * 9).toFixed(1)
      }
    };
  }

  generateProductId() {
    return Math.floor(Math.random() * 1000000000).toString();
  }

  generateImageList(count) {
    const images = [];
    for (let i = 0; i < count; i++) {
      images.push(`https://ae01.alicdn.com/kf/H${Math.random().toString(36).substring(2, 14).toUpperCase()}.jpg`);
    }
    return images;
  }

  buildAffiliateUrl(productId) {
    const targetUrl = encodeURIComponent(`${this.baseUrl}/item/${productId}.html`);
    return `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${this.affiliateKey}&dl_target_url=${targetUrl}`;
  }

  capitalize(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  getVariantName(index) {
    const variants = [
      'Wireless 2.4G', 'Bluetooth 5.0', 'USB-C Rechargeable', 'Silent Click',
      'RGB Backlit', 'Ergonomic Vertical', 'Compact Mini', 'Pro Gaming',
      'Multi-Device', 'Programmable Buttons'
    ];
    return variants[index % variants.length];
  }
}
