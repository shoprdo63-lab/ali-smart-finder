import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { AliExpressProduct, SearchRequest } from '../types';
import { TitleCleaner } from '../utils/titleCleaner';

export class AliExpressService {
  private readonly apiClient: AxiosInstance;
  private readonly cache: NodeCache;
  private readonly baseUrl = 'https://api.aliexpress.com';

  constructor(
    private readonly appKey: string,
    private readonly appSecret: string,
    private readonly trackingId: string,
    cacheTTL: number = 900 // 15 minutes
  ) {
    console.log('🚀 Initializing AliExpress Service...');
    console.log('🔑 App Key:', appKey.substring(0, 8) + '...');
    console.log('🔐 App Secret:', appSecret.substring(0, 8) + '...');
    console.log('🏷️ Tracking ID:', trackingId || 'NOT_SET');
    console.log('⏰ Cache TTL:', cacheTTL + ' seconds');
    
    if (!appKey || !appSecret) {
      console.error('❌ Missing required API credentials');
      throw new Error('AliExpress App Key and App Secret are required');
    }

    this.cache = new NodeCache({
      stdTTL: cacheTTL,
      checkperiod: 60,
      useClones: false,
    });

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Affiliate-Server/1.0.0',
      },
    });

    console.log('✅ AliExpress Service initialized successfully');
    console.log('🌐 Base URL:', this.baseUrl);
    
    // Test network connectivity
    this.testNetworkConnectivity();
  }

  /**
   * Test network connectivity to AliExpress API
   */
  private async testNetworkConnectivity(): Promise<void> {
    console.log('🌍 Testing network connectivity...');
    try {
      const response = await axios.get('https://api.aliexpress.com', { 
        timeout: 3000,
        validateStatus: () => true // Accept any status code
      });
      console.log('✅ Network connectivity test passed - Status:', response.status);
    } catch (error: any) {
      console.error('❌ Network connectivity test failed:', error.message);
      if (error.code === 'ENOTFOUND') {
        console.error('🔍 DNS resolution failed for api.aliexpress.com');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('🔍 Connection refused - possible firewall issue');
      } else if (error.code === 'ECONNABORTED') {
        console.error('🔍 Connection timeout - slow network or firewall');
      }
      // Don't throw here, just log the error - service can still try to work
    }
  }

  /**
   * Generate HMAC-SHA256 signature for AliExpress API
   */
  private generateSignature(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const queryString = sortedKeys
      .map(key => `${key}${params[key]}`)
      .join('');

    return crypto
      .createHmac('sha256', this.appSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Build affiliate deep link
   */
  public buildAffiliateUrl(productUrl: string): string {
    if (!this.trackingId || this.trackingId === 'NOT_SET') {
      console.warn('⚠️ No tracking ID set, returning original URL');
      return productUrl;
    }

    // For search results, build wholesale URL with tracking
    if (!productUrl.includes('/item/') && !productUrl.includes('.html')) {
      // This is a search query, build wholesale URL
      const searchQuery = encodeURIComponent(productUrl);
      const affiliateUrl = `https://www.aliexpress.com/wholesale?SearchText=${searchQuery}&aff_short_key=${this.trackingId}`;
      
      console.log('🔗 Wholesale affiliate URL built:', {
        query: productUrl,
        affiliate: affiliateUrl,
        trackingId: this.trackingId
      });
      
      return affiliateUrl;
    }

    // Ensure we have a proper product URL (item/xxxxx.html format)
    if (!productUrl.includes('/item/') && !productUrl.includes('.html')) {
      console.warn('⚠️ Invalid product URL format, returning original:', productUrl);
      return productUrl;
    }

    const encodedUrl = encodeURIComponent(productUrl);
    const affiliateUrl = `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${this.trackingId}&dl_target_url=${encodedUrl}`;
    
    console.log('🔗 Product affiliate URL built:', {
      original: productUrl,
      affiliate: affiliateUrl,
      trackingId: this.trackingId
    });
    
    return affiliateUrl;
  }

  /**
   * Search products on AliExpress with intelligent title cleaning
   */
  public async searchProducts(request: SearchRequest): Promise<AliExpressProduct[]> {
    const { title, url, maxResults = 10 } = request;
    console.log('🔍 Starting search with request:', request);

    // Extract and clean search query
    let searchQuery = title;
    if (url && !title) {
      searchQuery = this.extractQueryFromUrl(url);
    }

    if (!searchQuery || !TitleCleaner.isValidSearchTitle(searchQuery)) {
      throw new Error('Invalid or insufficient search query');
    }

    console.log('📝 Original search query:', searchQuery);

    // Clean the title for optimal search
    const cleanedTitle = TitleCleaner.cleanTitle(searchQuery);
    console.log('🧹 Cleaned search query:', cleanedTitle);
    
    // Check cache first
    const cacheKey = `search:${cleanedTitle}:${maxResults}`;
    const cached = this.cache.get<AliExpressProduct[]>(cacheKey);
    if (cached) {
      console.log(`📋 Cache hit for: ${cleanedTitle}`);
      return cached;
    }

    try {
      // Generate search variations including fallback to first 4-5 words
      const variations = TitleCleaner.generateSearchVariations(searchQuery);
      
      // Add fallback: first 4-5 words of cleaned title
      const words = cleanedTitle.split(/\s+/).filter(word => word.length > 2);
      if (words.length > 4) {
        const fallbackQuery = words.slice(0, 4).join(' ');
        if (!variations.includes(fallbackQuery)) {
          variations.push(fallbackQuery);
          console.log('🔄 Added fallback query:', fallbackQuery);
        }
      }
      
      console.log('🎯 Search variations to try:', variations);
      let allProducts: AliExpressProduct[] = [];

      for (let i = 0; i < variations.length && i < 3; i++) { // Try up to 3 variations
        const variation = variations[i];
        if (!variation) continue;
        
        console.log(`🔍 Trying search variation ${i + 1}/3: "${variation}"`);
        
        try {
          const products = await this.searchSingleQuery(variation, maxResults);
          console.log(`✅ Found ${products.length} products for variation: "${variation}"`);
          allProducts.push(...products);
          
          // If we found good results, stop trying variations
          if (products.length >= 3) {
            console.log(`🎉 Found sufficient results (${products.length}), stopping search`);
            break;
          }
        } catch (error) {
          console.warn(`❌ Search variation failed for "${variation}":`, error);
        }
      }

      // Remove duplicates and sort by relevance
      const uniqueProducts = this.deduplicateProducts(allProducts);
      const sortedProducts = this.sortProductsByRelevance(uniqueProducts, cleanedTitle);

      // Cache the results
      this.cache.set(cacheKey, sortedProducts);

      console.log(`🔍 Found ${sortedProducts.length} products for: ${cleanedTitle}`);
      return sortedProducts;

    } catch (error) {
      console.error('AliExpress search error:', error);
      
      // Fallback to mock data for development
      if (process.env['NODE_ENV'] === 'development') {
        console.log('🔄 Using mock data for development');
        return this.getMockProducts(cleanedTitle);
      }
      
      throw new Error(`Failed to search AliExpress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search a single query variation
   */
  private async searchSingleQuery(query: string, maxResults: number): Promise<AliExpressProduct[]> {
    console.log('🔍 Starting AliExpress API search for query:', query);
    console.log('📡 API Endpoint: https://api.aliexpress.com/router/rest');
    
    const params: Record<string, string> = {
      app_key: this.appKey,
      method: 'aliexpress.ds.product.search',
      timestamp: Date.now().toString(),
      format: 'json',
      v: '2.0',
      sign_method: 'sha256',
      session: 'access_token',
      fields: 'product_title,product_url,image_url,original_price,sale_price,evaluate_score,orders,package_type,seller_name,seller_rating',
      keywords: query,
      page_no: '1',
      page_size: Math.min(maxResults, 20).toString(),
      sort: 'default',
    };

    console.log('🔐 Generating signature with params:', Object.keys(params));
    params['sign'] = this.generateSignature(params);
    console.log('✅ Signature generated successfully');

    console.log('🌐 Making API request with timeout...');
    const startTime = Date.now();
    
    try {
      const response = await this.apiClient.get('/router/rest', { 
        params,
        timeout: 5000 // 5 second timeout
      });
      
      const duration = Date.now() - startTime;
      console.log(`⏱️ API response received in ${duration}ms`);
      console.log('📊 Response status:', response.status);
      console.log('📝 Response data keys:', Object.keys(response.data));

      if (response.data.error_response) {
        console.error('❌ AliExpress API Error:', response.data.error_response);
        throw new Error(`AliExpress API Error: ${response.data.error_response.msg || response.data.error_response.code || 'Unknown error'}`);
      }

      const products = response.data.aliexpress_ds_product_search_response?.products?.product || [];
      console.log(`📦 Found ${products.length} products in API response`);
      
      return products.map((product: any) => this.formatProduct(product));
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`💥 API request failed after ${duration}ms:`, error);
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('AliExpress API request timed out (5 seconds). Please check your network connection.');
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to AliExpress API. Please check your internet connection and DNS settings.');
      }
      
      throw error;
    }
  }

  /**
   * Format product data from API response
   */
  private formatProduct(product: any): AliExpressProduct {
    const originalPrice = parseFloat(product.original_price || product.sale_price || '0');
    const salePrice = parseFloat(product.sale_price || product.original_price || '0');
    const discount = originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;

    return {
      productId: product.product_id,
      title: product.product_title,
      imageUrl: product.image_url,
      originalPrice,
      salePrice,
      currency: 'USD',
      discount,
      rating: parseFloat(product.evaluate_score || '0'),
      orders: parseInt(product.orders || '0'),
      productUrl: product.product_url,
      affiliateUrl: this.buildAffiliateUrl(product.product_url),
      seller: {
        name: product.seller_name || 'Unknown Seller',
        rating: parseFloat(product.seller_rating || '0'),
      },
    };
  }

  /**
   * Remove duplicate products
   */
  private deduplicateProducts(products: AliExpressProduct[]): AliExpressProduct[] {
    const seen = new Set<string>();
    return products.filter(product => {
      const key = `${product.productId}-${product.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Sort products by relevance to search query
   */
  private sortProductsByRelevance(products: AliExpressProduct[], query: string): AliExpressProduct[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return products.sort((a, b) => {
      // Calculate relevance scores
      const aScore = this.calculateRelevanceScore(a.title, queryTerms);
      const bScore = this.calculateRelevanceScore(b.title, queryTerms);
      
      if (aScore !== bScore) {
        return bScore - aScore; // Higher score first
      }
      
      // If scores are equal, sort by price (lowest first)
      return a.salePrice - b.salePrice;
    });
  }

  /**
   * Calculate relevance score based on term matching
   */
  private calculateRelevanceScore(title: string, queryTerms: string[]): number {
    const titleLower = title.toLowerCase();
    let score = 0;
    
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        score += term.length; // Longer terms get more weight
      }
    }
    
    // Bonus for exact phrase matches
    if (titleLower.includes(queryTerms.join(' '))) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Extract query from Amazon URL
   */
  private extractQueryFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Extract ASIN from Amazon URL
      const asinMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) {
        return asinMatch[1] || '';
      }
      
      // Extract from query parameters
      const keywords = urlObj.searchParams.get('keywords');
      if (keywords) {
        return decodeURIComponent(keywords);
      }
      
      // Extract from path
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 3) {
        return decodeURIComponent(lastPart).replace(/-/g, ' ');
      }
      
      return '';
    } catch (error) {
      console.error('URL parsing error:', error);
      return '';
    }
  }

  /**
   * Get mock products for development/testing
   */
  private getMockProducts(query: string): AliExpressProduct[] {
    return [
      {
        productId: 'mock1',
        title: `${query} - Premium Quality Version`,
        imageUrl: 'https://ae01.alicdn.com/kf/Scf6c5f8c4f8f4e2b8d9e6c5a8b7e6d5f.jpg',
        originalPrice: 29.99,
        salePrice: 19.99,
        currency: 'USD',
        discount: 33,
        rating: 4.5,
        orders: 1234,
        productUrl: 'https://www.aliexpress.com/item/mock-product-1.html',
        affiliateUrl: this.buildAffiliateUrl(query), // Use query for wholesale search
        seller: {
          name: 'MockStore Official',
          rating: 4.7,
        },
      },
      {
        productId: 'mock2',
        title: `${query} - Budget Friendly Option`,
        imageUrl: 'https://ae01.alicdn.com/kf/S8f6c5f8c4f8f4e2b8d9e6c5a8b7e6d5g.jpg',
        originalPrice: 25.99,
        salePrice: 15.99,
        currency: 'USD',
        discount: 38,
        rating: 4.2,
        orders: 856,
        productUrl: 'https://www.aliexpress.com/item/mock-product-2.html',
        affiliateUrl: this.buildAffiliateUrl(query), // Use query for wholesale search
        seller: {
          name: 'Budget Deals',
          rating: 4.3,
        },
      },
    ];
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.flushAll();
  }
}
