import axios from 'axios';
import generateSignature from '../utils/signature.js';
import { generateSearchQuery } from '../utils/normalize.js';

/**
 * AliExpress API Service
 * Handles all communication with AliExpress Affiliate API
 */
class AliExpressService {
  constructor(appKey, appSecret, trackingId) {
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.trackingId = trackingId;
    this.baseUrl = 'https://api-sg.aliexpress.com/sync';
    this.mockMode = !appKey || !appSecret;

    if (this.mockMode) {
      console.warn('⚠️  AliExpress API credentials not configured - using mock mode');
    }
  }

  /**
   * Search for products on AliExpress
   */
  async searchProducts(query, options = {}) {
    const {
      maxResults = 10,
      sort = 'default',
      minPrice = null,
      maxPrice = null
    } = options;

    // Generate optimized search query
    const searchQuery = generateSearchQuery(query);
    console.log(`\n🔍 AliExpress Search:`);
    console.log(`   Original: ${query.substring(0, 60)}...`);
    console.log(`   Optimized: ${searchQuery}`);

    if (this.mockMode) {
      return this.getMockProducts(searchQuery, maxResults);
    }

    try {
      const params = {
        app_key: this.appKey,
        method: 'aliexpress.ds.product.get',
        timestamp: Date.now().toString(),
        format: 'json',
        v: '2.0',
        sign_method: 'sha256',
        target_currency: 'USD',
        target_language: 'EN',
        keywords: searchQuery,
        sort: sort,
        page_size: maxResults.toString()
      };

      if (minPrice) params.min_price = minPrice.toString();
      if (maxPrice) params.max_price = maxPrice.toString();

      const signature = generateSignature(params, this.appSecret);
      params.sign = signature;

      const url = new URL(this.baseUrl);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

      console.log(`📡 Calling AliExpress API...`);
      const response = await axios.get(url.toString(), {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error_response) {
        console.error('❌ AliExpress API Error:', response.data.error_response);
        throw new Error(response.data.error_response.msg || 'AliExpress API error');
      }

      const products = response.data.aliexpress_ds_product_get_response?.result?.products || [];
      console.log(`✅ Found ${products.length} products from API`);

      return products.map(p => this.formatProduct(p));

    } catch (error) {
      console.error('❌ AliExpress API error:', error.message);
      // Fallback to mock data
      return this.getMockProducts(searchQuery, maxResults);
    }
  }

  /**
   * Get product details by ID
   */
  async getProductDetails(productId) {
    if (this.mockMode) {
      return this.getMockProduct(productId);
    }

    try {
      const params = {
        app_key: this.appKey,
        method: 'aliexpress.ds.product.get',
        timestamp: Date.now().toString(),
        format: 'json',
        v: '2.0',
        sign_method: 'sha256',
        product_id: productId.toString()
      };

      const signature = generateSignature(params, this.appSecret);
      params.sign = signature;

      const url = new URL(this.baseUrl);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

      const response = await axios.get(url.toString(), { timeout: 10000 });

      if (response.data.error_response) {
        throw new Error(response.data.error_response.msg || 'Product not found');
      }

      const product = response.data.aliexpress_ds_product_get_response?.result;
      return this.formatProduct(product);

    } catch (error) {
      console.error('❌ Product details error:', error.message);
      return this.getMockProduct(productId);
    }
  }

  /**
   * Format product data from API response
   */
  formatProduct(product) {
    return {
      productId: product.product_id || product.productId || `mock-${Date.now()}`,
      title: product.product_title || product.title || 'Product',
      price: parseFloat(product.target_sale_price || product.salePrice || product.price || 0),
      salePrice: parseFloat(product.target_sale_price || product.salePrice || 0),
      originalPrice: parseFloat(product.target_original_price || product.originalPrice || 0),
      image: product.product_main_image_url || product.image || product.imageUrl || '',
      affiliateUrl: this.buildAffiliateUrl(product.promotion_link || product.product_url || ''),
      discount: parseInt(product.discount || 0),
      rating: parseFloat(product.evaluate_rate || product.rating || 0),
      orders: parseInt(product.volume || product.orders || 0),
      shippingCost: parseFloat(product.shipping_cost || 0),
      deliveryDays: parseInt(product.delivery_days || 15),
      seller: {
        name: product.seller_name || 'AliExpress Seller',
        rating: parseFloat(product.seller_rating || 0),
        positiveRate: parseFloat(product.seller_positive_rate || 0)
      }
    };
  }

  /**
   * Build affiliate deep link
   */
  buildAffiliateUrl(productUrl) {
    if (!this.trackingId) {
      return productUrl;
    }

    // If already an affiliate link, return as-is
    if (productUrl.includes('aff_short_key')) {
      return productUrl;
    }

    const encodedUrl = encodeURIComponent(productUrl);
    return `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${this.trackingId}&dl_target_url=${encodedUrl}`;
  }

  /**
   * Generate mock products for development
   */
  getMockProducts(query, count = 10) {
    console.log(`🔄 Generating ${count} mock products for: ${query}`);
    
    const products = [];
    for (let i = 0; i < count; i++) {
      const basePrice = (Math.random() * 50 + 10).toFixed(2);
      const originalPrice = (parseFloat(basePrice) * 1.3).toFixed(2);
      const discount = Math.round(((originalPrice - basePrice) / originalPrice) * 100);

      products.push({
        productId: `mock-${Date.now()}-${i}`,
        title: `${query} - ${['Premium', 'Budget', 'Professional', 'Deluxe', 'Standard'][i % 5]} Edition`,
        price: parseFloat(basePrice),
        salePrice: parseFloat(basePrice),
        originalPrice: parseFloat(originalPrice),
        image: `https://ae01.alicdn.com/kf/S${Math.random().toString(36).substring(7)}.jpg`,
        affiliateUrl: this.buildAffiliateUrl(`https://www.aliexpress.com/item/mock-${Date.now()}-${i}.html`),
        discount: discount,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        orders: Math.floor(Math.random() * 5000 + 100),
        shippingCost: Math.random() > 0.5 ? 0 : (Math.random() * 5).toFixed(2),
        deliveryDays: Math.floor(Math.random() * 20 + 10),
        seller: {
          name: `Seller ${i + 1}`,
          rating: (Math.random() * 0.5 + 4.5).toFixed(1),
          positiveRate: (Math.random() * 5 + 95).toFixed(1)
        }
      });
    }

    return products;
  }

  /**
   * Generate single mock product
   */
  getMockProduct(productId) {
    const basePrice = (Math.random() * 50 + 10).toFixed(2);
    const originalPrice = (parseFloat(basePrice) * 1.3).toFixed(2);

    return {
      productId: productId || `mock-${Date.now()}`,
      title: 'Mock Product - Premium Quality',
      price: parseFloat(basePrice),
      salePrice: parseFloat(basePrice),
      originalPrice: parseFloat(originalPrice),
      image: 'https://ae01.alicdn.com/kf/Smock.jpg',
      affiliateUrl: this.buildAffiliateUrl(`https://www.aliexpress.com/item/${productId}.html`),
      discount: 23,
      rating: 4.5,
      orders: 1234,
      shippingCost: 0,
      deliveryDays: 15,
      seller: {
        name: 'Mock Seller',
        rating: 4.7,
        positiveRate: 98.5
      }
    };
  }
}

export default AliExpressService;
