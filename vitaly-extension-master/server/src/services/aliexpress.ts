import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { AliExpressProduct, SearchRequest } from '../types';
import { TitleCleaner } from '../utils/titleCleaner';

export class AliExpressService {
  private readonly apiClient: AxiosInstance;
  private readonly cache: NodeCache;
  private readonly baseUrl = 'https://api.aliexpress.com/v1';

  constructor(
    private readonly appKey: string,
    private readonly appSecret: string,
    private readonly trackingId: string,
    cacheTTL: number = 900 // 15 minutes
  ) {
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
    if (!this.trackingId) {
      return productUrl;
    }

    const encodedUrl = encodeURIComponent(productUrl);
    return `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${this.trackingId}&dl_target_url=${encodedUrl}`;
  }

  /**
   * Search products on AliExpress with intelligent title cleaning
   */
  public async searchProducts(request: SearchRequest): Promise<AliExpressProduct[]> {
    const { title, url, maxResults = 10 } = request;

    // Extract and clean search query
    let searchQuery = title;
    if (url && !title) {
      searchQuery = this.extractQueryFromUrl(url);
    }

    if (!searchQuery || !TitleCleaner.isValidSearchTitle(searchQuery)) {
      throw new Error('Invalid or insufficient search query');
    }

    // Clean the title for optimal search
    const cleanedTitle = TitleCleaner.cleanTitle(searchQuery);
    
    // Check cache first
    const cacheKey = `search:${cleanedTitle}:${maxResults}`;
    const cached = this.cache.get<AliExpressProduct[]>(cacheKey);
    if (cached) {
      console.log(`📋 Cache hit for: ${cleanedTitle}`);
      return cached;
    }

    try {
      // Try multiple search variations for better results
      const variations = TitleCleaner.generateSearchVariations(searchQuery);
      let allProducts: AliExpressProduct[] = [];

      for (const variation of variations.slice(0, 3)) { // Try up to 3 variations
        try {
          const products = await this.searchSingleQuery(variation, maxResults);
          allProducts.push(...products);
          
          // If we found good results, stop trying variations
          if (products.length >= 3) {
            break;
          }
        } catch (error) {
          console.warn(`Search variation failed for "${variation}":`, error);
          continue;
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
      
      // Fallback to real AliExpress search URL instead of mock products
      console.log('⚠️  API failed, returning search URL for real products');
      return this.getFallbackSearchProducts(cleanedTitle);
    }
  }

  /**
   * Search a single query variation
   */
  private async searchSingleQuery(query: string, maxResults: number): Promise<AliExpressProduct[]> {
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

    params.sign = this.generateSignature(params);

    const response = await this.apiClient.get('/router/rest', { params });

    if (response.data.error_response) {
      throw new Error(response.data.error_response.msg || 'AliExpress API error');
    }

    const products = response.data.aliexpress_ds_product_search_response?.products?.product || [];
    return products.map((product: any) => this.formatProduct(product));
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
        return asinMatch[1];
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
   * Get fallback search products - returns real AliExpress search URL
   * This ensures users are directed to actual products, not mock data
   */
  private getFallbackSearchProducts(query: string): AliExpressProduct[] {
    // Create a real AliExpress search URL
    const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}&sortType=total_tranpro_desc`;
    const affiliateSearchUrl = this.buildAffiliateUrl(searchUrl);
    
    return [
      {
        productId: 'search-result',
        title: `${query} - View All Results on AliExpress`,
        imageUrl: 'https://ae01.alicdn.com/kf/S8c5f5c8c4f8f4e2b8d9e6c5a8b7e6d5f.jpg',
        originalPrice: 0,
        salePrice: 0,
        currency: 'USD',
        discount: 0,
        rating: 0,
        orders: 0,
        productUrl: searchUrl,
        affiliateUrl: affiliateSearchUrl,
        seller: {
          name: 'AliExpress Search',
          rating: 0,
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
