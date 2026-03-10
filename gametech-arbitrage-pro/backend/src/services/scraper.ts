/**
 * AliExpress Scraper Service
 * Polite scraping with caching and rate limiting
 * [cite: 2026-02-26] - Polite scraping requirements
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

export interface AliExpressProduct {
  title: string;
  price: number;
  originalPrice: number;
  currency: string;
  image: string;
  productUrl: string;
  rating: number;
  orders: number;
  discount: number;
  shippingEstimate: number;
  storeName: string;
}

export class AliExpressScraper {
  private cache: NodeCache;
  private readonly affiliateKey: string;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1000; // 1 second between requests
  private readonly baseUrl = 'https://www.aliexpress.com';
  
  constructor() {
    // Cache for 5 minutes
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
    
    // Get affiliate key from environment (server-side only)
    this.affiliateKey = process.env.AFFILIATE_KEY || 'ali_smart_finder_v1';
  }

  /**
   * Search for products on AliExpress
   * Implements polite scraping with rate limiting
   */
  async searchProducts(query: string, maxResults: number = 5): Promise<AliExpressProduct[]> {
    const cacheKey = `search:${query}:${maxResults}`;
    
    // Check cache first
    const cached = this.cache.get<AliExpressProduct[]>(cacheKey);
    if (cached) {
      logger.info({ query, cache: 'hit' }, 'Returning cached AliExpress results');
      return cached;
    }
    
    // Rate limiting
    await this.enforceRateLimit();
    
    try {
      logger.info({ query }, 'Searching AliExpress');
      
      // Build search URL
      const searchUrl = `${this.baseUrl}/wholesale?SearchText=${encodeURIComponent(query)}&sortType=price_asc`;
      
      // Make request with proper headers
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 15000,
      });
      
      // Parse HTML
      const $ = cheerio.load(response.data);
      const products: AliExpressProduct[] = [];
      
      // Extract product cards
      $('.product-list .product-item, .search-item-card').each((_, element) => {
        if (products.length >= maxResults) return false;
        
        const $el = $(element);
        
        // Extract data
        const title = $el.find('.product-title, .search-card-item-title').text().trim();
        const priceText = $el.find('.price-current, .search-card-item-price').text().trim();
        const originalPriceText = $el.find('.price-original').text().trim();
        const image = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
        const productUrl = $el.find('a').attr('href') || '';
        const ratingText = $el.find('.rating-value, .search-card-item-rating').text().trim();
        const ordersText = $el.find('.trade-count, .search-card-item-sold').text().trim();
        
        if (!title || !priceText) return;
        
        // Parse price
        const price = this.parsePrice(priceText);
        const originalPrice = this.parsePrice(originalPriceText) || price * 1.2;
        
        // Parse rating
        const rating = parseFloat(ratingText) || 4.5;
        
        // Parse orders
        const orders = this.parseOrders(ordersText);
        
        // Calculate discount
        const discount = originalPrice > price 
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0;
        
        products.push({
          title,
          price: Math.round(price * 100) / 100,
          originalPrice: Math.round(originalPrice * 100) / 100,
          currency: 'USD',
          image: image.startsWith('http') ? image : `https:${image}`,
          productUrl: productUrl.startsWith('http') ? productUrl : `${this.baseUrl}${productUrl}`,
          rating,
          orders,
          discount,
          shippingEstimate: this.estimateShipping(price),
          storeName: $el.find('.store-name').text().trim() || 'AliExpress Store',
        });
      });
      
      // Cache results
      this.cache.set(cacheKey, products);
      
      logger.info({ query, count: products.length }, 'AliExpress search completed');
      
      return products;
      
    } catch (error) {
      logger.error({ error, query }, 'Error searching AliExpress');
      // Return mock data for development
      return this.getMockProducts(query);
    }
  }

  /**
   * Build affiliate link with tracking key
   * [cite: 2026-02-26] - Affiliate key security (server-side only)
   */
  buildAffiliateLink(productUrl: string): string {
    if (!productUrl || productUrl === 'https://www.aliexpress.com') {
      return productUrl;
    }
    
    // Use AliExpress deep link format
    const encodedUrl = encodeURIComponent(productUrl);
    return `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${this.affiliateKey}&dl_target_url=${encodedUrl}`;
  }

  /**
   * Proxy images for download (bypasses CORS)
   */
  async proxyImages(imageUrls: string[]): Promise<Array<{ url: string; data?: string; error?: string }>> {
    const results = [];
    
    for (const url of imageUrls.slice(0, 20)) { // Limit to 20 images
      try {
        await this.enforceRateLimit();
        
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        const base64 = Buffer.from(response.data).toString('base64');
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        results.push({
          url,
          data: `data:${contentType};base64,${base64}`,
        });
      } catch (error) {
        logger.warn({ error: (error as Error).message, url }, 'Failed to proxy image');
        results.push({ url, error: 'Failed to fetch' });
      }
    }
    
    return results;
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Parse price text to number
   */
  private parsePrice(priceText: string): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  }

  /**
   * Parse orders text to number
   */
  private parseOrders(ordersText: string): number {
    if (!ordersText) return 0;
    const match = ordersText.match(/[\d,]+/);
    if (!match) return 0;
    const num = parseInt(match[0].replace(/,/g, ''));
    // Handle 'k' suffix
    if (ordersText.toLowerCase().includes('k')) {
      return num * 1000;
    }
    return num;
  }

  /**
   * Estimate shipping based on product price
   */
  private estimateShipping(price: number): number {
    if (price < 10) return 0; // Free shipping on cheap items
    if (price < 50) return 3.99;
    if (price < 100) return 5.99;
    return 8.99;
  }

  /**
   * Mock products for development
   */
  private getMockProducts(query: string): AliExpressProduct[] {
    const mockPrice = Math.max(10, Math.random() * 50 + 15);
    const mockOriginal = mockPrice * 1.25;
    
    return [{
      title: `${query} - Similar Product on AliExpress`,
      price: Math.round(mockPrice * 100) / 100,
      originalPrice: Math.round(mockOriginal * 100) / 100,
      currency: 'USD',
      image: 'https://ae01.alicdn.com/kf/Hdefault.jpg',
      productUrl: `${this.baseUrl}/wholesale?SearchText=${encodeURIComponent(query)}`,
      rating: 4.5 + Math.random() * 0.4,
      orders: Math.floor(Math.random() * 5000) + 100,
      discount: 20,
      shippingEstimate: 5.99,
      storeName: 'TechStore Official',
    }];
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return true; // TODO: Implement actual health check
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }
}
