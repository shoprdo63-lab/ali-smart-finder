import crypto from 'crypto';
import generateSignature from '../utils/signature.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

class AliExpressService {
  constructor() {
    this.appKey = process.env.ALI_APP_KEY;
    this.appSecret = process.env.ALI_APP_SECRET;
    this.trackingId = process.env.ALI_TRACKING_ID || '';
    this.baseUrl = 'https://api-sg.aliexpress.com/sync';

    console.log('[AliExpressService] ENV ALI_APP_KEY:', process.env.ALI_APP_KEY);
    console.log('[AliExpressService] ENV ALI_APP_SECRET exists:', !!process.env.ALI_APP_SECRET);

    if (!this.appKey || !this.appSecret || this.appKey === 'YOUR_APP_KEY_HERE') {
      console.warn('⚠️  ALI_APP_KEY or ALI_APP_SECRET not set correctly - using mock mode');
      console.warn('   Key present:', !!this.appKey);
      console.warn('   Secret present:', !!this.appSecret);
      this.mockMode = true;
    } else {
      console.log('✅ AliExpress API credentials configured');
      this.mockMode = false;
    }
  }

  async searchProducts(query) {
    try {
      const cleanedQuery = this.cleanSearchQuery(query);
      console.log(`📝 Original: ${query}`);
      console.log(`🧹 Cleaned: ${cleanedQuery}`);

      if (this.mockMode) {
        console.log('🔄 Using mock data (API credentials not configured)');
        return this.getFallbackSearchResult(cleanedQuery);
      }

      const params = {
        app_key: this.appKey,
        method: 'aliexpress.affiliate.product.query',
        timestamp: Date.now().toString().slice(0, 10),
        format: 'json',
        v: '2.0',
        sign_method: 'sha256',
        keywords: cleanedQuery,
        page_size: '5',
        sort: 'SALE_PRICE_ASC',
        target_currency: 'USD',
        target_language: 'EN'
      };

      const signature = generateSignature(params, this.appSecret);
      params.sign = signature;

      const url = new URL(this.baseUrl);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      console.log(`🔌 Calling API: ${url.toString().replace(this.appSecret, '***')}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      });
      
      const responseText = await response.text();
      
      console.log(`📡 API Response status: ${response.status}`);
      console.log(`📡 API Response body (first 500 chars): ${responseText.substring(0, 500)}`);

      if (!response.ok) {
        console.error(`❌ HTTP Error ${response.status}:`, responseText);
        throw new Error(`AliExpress API error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log(`🌐 API Response keys:`, Object.keys(data));

      if (data.error_response) {
        console.error('❌ AliExpress API Error:', data.error_response);
        throw new Error(data.error_response.msg || 'AliExpress API error');
      }

      let products = [];
      
      // Try different response structures
      if (data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product) {
        products = data.aliexpress_affiliate_product_query_response.resp_result.result.products.product;
        console.log('📦 Found products in resp_result.result.products.product');
      } else if (data.aliexpress_affiliate_product_query_response?.products?.product) {
        products = data.aliexpress_affiliate_product_query_response.products.product;
        console.log('📦 Found products in products.product');
      } else if (data.aliexpress_ds_product_get_response?.result?.products) {
        products = data.aliexpress_ds_product_get_response.result.products;
        console.log('📦 Found products in ds_product_get_response');
      } else {
        console.log('⚠️ Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
      }
      
      console.log(`✅ Found ${products.length} products via API`);

      if (!products || products.length === 0) {
        console.log('⚠️  API returned 0 products — trying web scraping');
        return await this.scrapeAliExpressProducts(cleanedQuery);
      }
      
      const bestMatch = this.findBestMatch(cleanedQuery, products);
      
      if (!bestMatch) {
        console.log('⚠️  No products available — trying web scraping');
        return await this.scrapeAliExpressProducts(cleanedQuery);
      }
      
      const product = bestMatch;
      console.log(`✅ Best match: ${product.product_title || product.title} (${bestMatch.similarity}% similarity)`);
      
      // Use promotion_link from API (already an affiliate link) or build URL
      let affiliateUrl = product.promotion_link;
      let productUrl = product.product_detail_url || product.product_url || product.url;
      
      // If no promotion link, try to build from product URL
      if (!affiliateUrl) {
        if (!productUrl && product.product_id) {
          productUrl = `https://www.aliexpress.com/item/${product.product_id}.html`;
        }
        
        if (!productUrl) {
          const searchQuery = encodeURIComponent(this.sanitizeTitle(product.product_title || product.title || cleanedQuery));
          productUrl = `https://www.aliexpress.com/wholesale?SearchText=${searchQuery}&sortType=price_asc`;
          console.warn('⚠️ No product URL or ID found, using search URL');
        }
        
        affiliateUrl = this.buildAffiliateUrl(productUrl);
      }
      
      console.log(`🔗 Product URL: ${productUrl?.substring(0, 80)}...`);
      console.log(`🔗 Affiliate URL: ${affiliateUrl?.substring(0, 80)}...`);

      return {
        title: product.product_title || product.title || cleanedQuery,
        price: parseFloat(product.target_sale_price || product.sale_price || product.price || '0'),
        originalPrice: parseFloat(product.target_original_price || product.original_price || '0'),
        image: product.product_main_image_url || product.image_url || product.pic_url || '',
        url: productUrl || affiliateUrl,
        affiliateUrl: affiliateUrl,
        aliUrl: affiliateUrl,
        discount: product.discount || 0,
        rating: parseFloat(product.evaluate_rate || product.avg_rating || '0'),
        orders: parseInt(product.volume || product.sale_count || '0'),
        productId: product.product_id || '',
        similarity: bestMatch.similarity || 0
      };

    } catch (error) {
      console.error('AliExpress search error:', error);
      return await this.scrapeAliExpressProducts(query);
    }
  }

  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (s1 === s2) return 100;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    const costs = [];
    for (let i = 0; i <= shorter.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= longer.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (shorter[i - 1] !== longer[j - 1]) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[longer.length] = lastValue;
    }
    const distance = costs[longer.length];
    return Math.round((1 - distance / longer.length) * 100);
  }

  findBestMatch(searchQuery, products) {
    if (!products || products.length === 0) return null;
    
    const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const modelNumbers = searchQuery.match(/\b[A-Z0-9]+[-]?[0-9]+[A-Z0-9-]*\b/gi) || [];
    
    console.log(`🔍 Searching for: "${searchQuery}"`);
    console.log(`📝 Key terms: ${queryTerms.join(', ')}`);
    console.log(`🔢 Model numbers: ${modelNumbers.join(', ')}`);
    
    const scoredProducts = products.map(product => {
      const title = (product.product_title || product.title || '').toLowerCase();
      const price = parseFloat(product.target_sale_price || product.sale_price || product.price || '999999');
      
      const similarity = this.calculateSimilarity(searchQuery, title);
      
      const matchedTerms = queryTerms.filter(term => title.includes(term)).length;
      const keywordScore = (matchedTerms / Math.max(queryTerms.length, 1)) * 100;
      
      const modelBonus = modelNumbers.some(model => 
        title.includes(model.toLowerCase())
      ) ? 50 : 0;
      
      const priceScore = price > 1 && price < 500 ? 10 : 0;
      
      const totalScore = (similarity * 0.4) + (keywordScore * 0.4) + modelBonus + priceScore;
      
      return {
        product,
        title,
        price,
        similarity,
        keywordScore,
        modelBonus,
        totalScore
      };
    });
    
    scoredProducts.sort((a, b) => b.totalScore - a.totalScore);
    
    console.log('\n🏆 Top matches:');
    scoredProducts.slice(0, 3).forEach((item, i) => {
      console.log(`${i + 1}. Score: ${item.totalScore.toFixed(1)} | Similarity: ${item.similarity}% | Keywords: ${item.keywordScore.toFixed(0)}% | Price: $${item.price}`);
      console.log(`   "${item.title.substring(0, 60)}..."`);
    });
    
    const best = scoredProducts[0];
    
    console.log(`\n✅ Selected best match with score: ${best.totalScore.toFixed(1)} (similarity: ${best.similarity}%, keywords: ${best.keywordScore.toFixed(0)}%)`);
    return { ...best.product, similarity: Math.round(best.similarity) };
  }

  sanitizeTitle(title) {
    let sanitized = title.replace(/[|:\-]/g, ' ');
    
    const colorPatterns = [
      /\b(glacier|charcoal|white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|gold)\b/gi,
      /\b(bundle|pack|set|kit)\b/gi
    ];
    
    colorPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, ' ');
    });
    
    const words = sanitized.split(/\s+/).filter(w => w.length > 0);
    const result = words.slice(0, 4).join(' ');
    
    return result.trim();
  }

  cleanSearchQuery(query) {
    const brands = ['Logitech', 'Razer', 'Corsair', 'SteelSeries', 'HyperX', 'ASUS', 'MSI', 'Gigabyte', 
                    'Samsung', 'LG', 'Dell', 'HP', 'Lenovo', 'Acer', 'Sony', 'Nintendo', 'Xbox', 'PlayStation',
                    'Apple', 'Anker', 'Belkin', 'TP-Link', 'Netgear', 'Seagate', 'Western Digital', 'Kingston'];
    
    let brand = '';
    for (const b of brands) {
      if (query.toLowerCase().includes(b.toLowerCase())) {
        brand = b;
        break;
      }
    }
    
    const modelNumberPattern = /\b[A-Z0-9]+[-]?[0-9]+[A-Z0-9-]*\b/gi;
    const modelNumbers = query.match(modelNumberPattern) || [];
    
    const ramMatch = query.match(/(\d+)\s?GB\s?(RAM|DDR\d?)/i);
    const storageMatch = query.match(/(\d+)\s?(GB|TB)\s?(SSD|HDD|NVMe)?/i);
    const gpuMatch = query.match(/(RTX\s?\d{3,4}|GTX\s?\d{3,4}|RX\s?\d{3,4})/i);
    const lightsMatch = query.match(/(\d+)\s?(light|lights|bulb|bulbs)/i);
    
    let cleaned = query.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');
    
    const fluffWords = [
      'with', 'for', 'and', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'from',
      'new', 'brand', 'original', 'genuine', 'official', 'certified',
      'bundle', 'pack', 'set', 'kit', 'combo', 'hallway', 'entryway', 'bedroom',
      'dining', 'room', 'farmhouse', 'kitchen', 'office'
    ];
    
    // Product type keywords - most specific first
    const productTypes = {
      'chandelier': ['chandelier', 'ceiling', 'light'],
      'pendant': ['pendant', 'light'],
      'gaming': ['gaming'],
      'mouse': ['mouse'],
      'keyboard': ['keyboard'],
      'monitor': ['monitor'],
      'headset': ['headset']
    };
    
    const importantWords = ['gaming', 'wireless', 'mechanical', 'rgb', 'optical', 'laser', 
                            'bluetooth', 'usb', 'hdmi', 'monitor', 'keyboard', 'mouse', 'headset', 
                            'controller', 'laptop', 'desktop', 'tablet', 'ceiling', 'light', 'fixture', 
                            'chandelier', 'modern', 'flush', 'mount', 'sputnik', 'gold', 
                            'silver', 'nickel', 'brushed', 'pendant', 'led', 'industrial', 'vintage'];

    const words = cleaned.split(/\s+/).filter(w => {
      const lower = w.toLowerCase();
      return importantWords.includes(lower) || 
             brands.some(b => b.toLowerCase() === lower) ||
             (/[A-Z0-9]/.test(w) && /\d/.test(w)) ||
             (w.length > 2 && !fluffWords.includes(lower));
    });

    let result = [];
    
    // Detect product type and use specific search terms
    const queryLower = query.toLowerCase();
    let productType = null;
    
    if (queryLower.includes('chandelier')) {
      productType = 'chandelier';
      result.push('chandelier', 'ceiling', 'light');
      if (lightsMatch) result.push(lightsMatch[0]);
      if (queryLower.includes('crystal')) result.push('crystal');
      if (queryLower.includes('modern')) result.push('modern');
      if (queryLower.includes('gold')) result.push('gold');
      if (queryLower.includes('sputnik')) result.push('sputnik');
    } else if (queryLower.includes('pendant')) {
      productType = 'pendant';
      result.push('pendant', 'light');
    } else {
      // For gaming/tech products, use brand + model + key features
      if (brand) result.push(brand);
      if (modelNumbers.length > 0) result.push(...modelNumbers.slice(0, 2));
      
      const remainingWords = words.filter(w => 
        !result.some(r => r.toLowerCase() === w.toLowerCase())
      ).slice(0, 6);
      result.push(...remainingWords);
      
      if (lightsMatch) result.push(lightsMatch[0]);
      if (ramMatch) result.push(ramMatch[0]);
      if (storageMatch) result.push(storageMatch[0]);
      if (gpuMatch) result.push(gpuMatch[0]);
    }
    
    return result.join(' ').trim();
  }

  buildAffiliateUrl(productUrl) {
    if (!this.trackingId) {
      console.warn('⚠️  No tracking ID set');
      return productUrl;
    }

    try {
      const encodedUrl = encodeURIComponent(productUrl);
      const affiliateUrl = `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${this.trackingId}&dl_target_url=${encodedUrl}`;
      return affiliateUrl;
    } catch (error) {
      console.error('Error building affiliate URL:', error);
      return productUrl;
    }
  }

  async scrapeAliExpressProducts(query) {
    try {
      const cleanTitle = this.sanitizeTitle(query);
      const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(cleanTitle)}&sortType=price_asc`;
      
      console.log(`🕷️  Scraping AliExpress for: "${cleanTitle}"`);
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const products = [];

      const scripts = $('script').toArray();
      
      for (const script of scripts) {
        const scriptContent = $(script).html();
        if (scriptContent && scriptContent.includes('window.runParams')) {
          try {
            const dataMatch = scriptContent.match(/window\.runParams\s*=\s*(\{[\s\S]*?\});/);
            if (dataMatch) {
              const data = JSON.parse(dataMatch[1]);
              
              if (data.data?.root?.fields?.mods?.itemList?.content) {
                const items = data.data.root.fields.mods.itemList.content;
                
                for (const item of items.slice(0, 5)) {
                  if (item.productId && item.title?.displayTitle) {
                    const price = parseFloat(item.prices?.salePrice?.minPrice || item.prices?.originalPrice?.minPrice || 0);
                    const originalPrice = parseFloat(item.prices?.originalPrice?.minPrice || price);
                    
                    products.push({
                      productId: item.productId,
                      title: item.title.displayTitle,
                      price: price,
                      originalPrice: originalPrice,
                      image: item.image?.imgUrl || '',
                      productUrl: `https://www.aliexpress.com/item/${item.productId}.html`,
                      rating: parseFloat(item.evaluation?.starRating || 0),
                      orders: parseInt(item.trade?.tradeDesc?.replace(/[^0-9]/g, '') || 0),
                      discount: originalPrice > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0
                    });
                  }
                }
                break;
              }
            }
          } catch (e) {
            console.log('Error parsing product data:', e.message);
            continue;
          }
        }
      }

      if (products.length > 0) {
        console.log(`✅ Scraped ${products.length} products`);
        
        const bestMatch = this.findBestMatch(query, products.map(p => ({
          product_title: p.title,
          target_sale_price: p.price,
          target_original_price: p.originalPrice,
          product_main_image_url: p.image,
          product_url: p.productUrl,
          evaluate_rate: p.rating,
          volume: p.orders,
          product_id: p.productId,
          discount: p.discount
        })));
        
        if (bestMatch) {
          const productUrl = bestMatch.product_url || `https://www.aliexpress.com/item/${bestMatch.product_id}.html`;
          return {
            title: bestMatch.product_title,
            price: parseFloat(bestMatch.target_sale_price || 0),
            originalPrice: parseFloat(bestMatch.target_original_price || 0),
            image: bestMatch.product_main_image_url,
            url: productUrl,
            affiliateUrl: this.buildAffiliateUrl(productUrl),
            aliUrl: this.buildAffiliateUrl(productUrl),
            discount: bestMatch.discount || 0,
            rating: parseFloat(bestMatch.evaluate_rate || 0),
            orders: parseInt(bestMatch.volume || 0),
            productId: bestMatch.product_id,
            similarity: bestMatch.similarity || 0
          };
        }
      }
      
      console.log('⚠️  No products found via scraping');
      return this.getFallbackSearchResult(query);
      
    } catch (error) {
      console.error('Scraping error:', error.message);
      return this.getFallbackSearchResult(query);
    }
  }

  getFallbackSearchResult(query) {
    const cleanTitle = query.split(' ').slice(0, 5).join(' ');
    const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(cleanTitle)}&sortType=price_asc`;
    const affiliateUrl = this.buildAffiliateUrl(searchUrl);
    
    console.log(`🔍 Fallback: Directing to AliExpress search for "${cleanTitle}"`);
    
    return {
      title: `${cleanTitle} - View Results on AliExpress`,
      price: 0,
      originalPrice: 0,
      image: 'https://ae01.alicdn.com/kf/S8c5f5c8c4f8f4e2b8d9e6c5a8b7e6d5f.jpg',
      url: searchUrl,
      affiliateUrl: affiliateUrl,
      aliUrl: affiliateUrl,
      discount: 0,
      rating: 0,
      orders: 0,
      seller: 'AliExpress',
      productId: 'search-result',
      similarity: 50,
      isSearchUrl: true
    };
  }
}

export default AliExpressService;
