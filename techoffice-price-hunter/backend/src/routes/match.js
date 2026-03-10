import express from 'express';
import NodeCache from 'node-cache';
import AmazonService from '../services/amazonService.js';
import AliExpressService from '../services/aliexpressService.js';
import ArbitrageCalculator from '../services/arbitrageCalculator.js';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

const amazonService = new AmazonService();
const aliExpressService = new AliExpressService();
const arbitrageCalculator = new ArbitrageCalculator();

// Embedded affiliate key
const AFFILIATE_SHORT_KEY = 'ali_smart_finder_v1';

/**
 * GET /api/match-amazon?asin=xxx
 * Returns Amazon product info with matched AliExpress product and arbitrage calculation
 */
router.get('/match-amazon', async (req, res) => {
  try {
    const { asin, title } = req.query;

    if (!asin && !title) {
      return res.status(400).json({
        success: false,
        error: { message: 'ASIN or product title is required' }
      });
    }

    const cacheKey = `match:amazon:${asin || title}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch Amazon product data
    const amazonProduct = await amazonService.getProduct(asin, title);
    
    if (!amazonProduct) {
      return res.status(404).json({
        success: false,
        error: { message: 'Amazon product not found' }
      });
    }

    // Search for matching AliExpress product
    const aliExpressProduct = await aliExpressService.searchProduct(
      amazonProduct.title,
      amazonProduct.category
    );

    // Calculate arbitrage
    const arbitrage = aliExpressProduct 
      ? arbitrageCalculator.calculate(amazonProduct, aliExpressProduct)
      : null;

    // Generate affiliate deep link
    const affiliateUrl = aliExpressProduct
      ? buildAffiliateLink(aliExpressProduct.productId)
      : null;

    const response = {
      success: true,
      data: {
        amazon: amazonProduct,
        aliexpress: aliExpressProduct,
        arbitrage: arbitrage,
        affiliateUrl: affiliateUrl,
        timestamp: new Date().toISOString()
      }
    };

    cache.set(cacheKey, response);
    res.json(response);

  } catch (error) {
    console.error('Match Amazon Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * GET /api/match-aliexpress?productId=xxx
 * Returns AliExpress product with stock availability
 */
router.get('/match-aliexpress', async (req, res) => {
  try {
    const { productId, url } = req.query;

    if (!productId && !url) {
      return res.status(400).json({
        success: false,
        error: { message: 'Product ID or URL is required' }
      });
    }

    const cacheKey = `match:aliexpress:${productId || url}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const aliProduct = await aliExpressService.getProductDetails(productId, url);
    
    if (!aliProduct) {
      return res.status(404).json({
        success: false,
        error: { message: 'AliExpress product not found' }
      });
    }

    // Check stock availability
    const stockInfo = await aliExpressService.checkStock(productId);

    const response = {
      success: true,
      data: {
        ...aliProduct,
        stock: stockInfo,
        affiliateUrl: buildAffiliateLink(aliProduct.productId)
      }
    };

    cache.set(cacheKey, response);
    res.json(response);

  } catch (error) {
    console.error('Match AliExpress Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * GET /api/search?query=xxx
 * Search products across both platforms
 */
router.get('/search', async (req, res) => {
  try {
    const { query, category = 'tech-office' } = req.query;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: { message: 'Query must be at least 3 characters' }
      });
    }

    const cacheKey = `search:${query}:${category}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Search AliExpress for tech/office products
    const aliResults = await aliExpressService.searchProducts(query, {
      category: 'tech-office',
      maxResults: 5
    });

    const response = {
      success: true,
      data: {
        query: query.trim(),
        results: aliResults.map(product => ({
          ...product,
          affiliateUrl: buildAffiliateLink(product.productId)
        })),
        total: aliResults.length
      }
    };

    cache.set(cacheKey, response);
    res.json(response);

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

function buildAffiliateLink(productId) {
  if (!productId) return null;
  const baseUrl = `https://www.aliexpress.com/item/${productId}.html`;
  return `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${AFFILIATE_SHORT_KEY}&dl_target_url=${encodeURIComponent(baseUrl)}`;
}

export default router;
