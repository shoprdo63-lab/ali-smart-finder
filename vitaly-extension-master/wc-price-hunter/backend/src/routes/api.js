import express from 'express';
import AliExpressService from '../services/aliexpress.js';
import ProductMatcher from '../services/matcher.js';
import CacheService from '../services/cache.js';

const router = express.Router();

// Initialize services
const aliexpress = new AliExpressService(
  process.env.ALI_APP_KEY,
  process.env.ALI_APP_SECRET,
  process.env.ALI_TRACKING_ID
);

const matcher = new ProductMatcher(parseFloat(process.env.MATCH_THRESHOLD || 0.75));
const cache = new CacheService(parseInt(process.env.CACHE_TTL || 600));

/**
 * POST /api/match-amazon
 * Find matching AliExpress products for Amazon product
 */
router.post('/match-amazon', async (req, res, next) => {
  try {
    const { title, price, asin, brand, model } = req.body;

    // Validation
    if (!title || title.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Product title is required (min 3 characters)'
      });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🛒 AMAZON → ALIEXPRESS MATCH REQUEST`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Title: ${title.substring(0, 60)}...`);
    console.log(`Price: $${price || 'N/A'}`);
    console.log(`ASIN: ${asin || 'N/A'}`);

    // Check cache
    const cacheKey = `amazon:${asin || title}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Returning cached result`);
      return res.json(cached);
    }

    // Search AliExpress
    const aliProducts = await aliexpress.searchProducts(title, { maxResults: 15 });

    if (aliProducts.length === 0) {
      const response = {
        success: true,
        matched: false,
        message: 'No matching products found on AliExpress'
      };
      cache.set(cacheKey, response, 300); // Cache for 5 minutes
      return res.json(response);
    }

    // Match products
    const sourceProduct = { title, price: parseFloat(price || 0), asin, brand, model };
    const matchResult = matcher.matchProduct(sourceProduct, aliProducts);

    const response = {
      success: true,
      matched: matchResult.matched,
      confidence: matchResult.confidence,
      bestDeal: matchResult.bestDeal,
      alternatives: matchResult.alternatives,
      totalResults: aliProducts.length
    };

    // Cache result
    cache.set(cacheKey, response);

    console.log(`\n✅ Match complete - Confidence: ${(matchResult.confidence * 100).toFixed(1)}%`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    res.json(response);

  } catch (error) {
    console.error('❌ Match error:', error);
    next(error);
  }
});

/**
 * POST /api/match-aliexpress
 * Find cheaper alternatives for AliExpress product
 */
router.post('/match-aliexpress', async (req, res, next) => {
  try {
    const { productId, title, price, shippingCost } = req.body;

    // Validation
    if (!title || title.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Product title is required (min 3 characters)'
      });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 ALIEXPRESS CHEAPER ALTERNATIVES`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Title: ${title.substring(0, 60)}...`);
    console.log(`Price: $${price || 'N/A'}`);
    console.log(`Shipping: $${shippingCost || 0}`);

    // Check cache
    const cacheKey = `aliexpress:${productId || title}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Returning cached result`);
      return res.json(cached);
    }

    // Search for similar products
    const allListings = await aliexpress.searchProducts(title, { maxResults: 20 });

    if (allListings.length === 0) {
      const response = {
        success: true,
        hasCheaper: false,
        message: 'No alternative listings found'
      };
      cache.set(cacheKey, response, 300);
      return res.json(response);
    }

    // Find cheaper alternatives
    const currentProduct = {
      productId,
      title,
      price: parseFloat(price || 0),
      salePrice: parseFloat(price || 0),
      shippingCost: parseFloat(shippingCost || 0)
    };

    const cheaperResult = matcher.findCheaperAlternatives(currentProduct, allListings);

    const response = {
      success: true,
      hasCheaper: cheaperResult.hasCheaper,
      currentPrice: cheaperResult.currentPrice,
      cheapest: cheaperResult.cheapest,
      savings: cheaperResult.savings,
      savingsPercent: cheaperResult.savingsPercent,
      alternatives: cheaperResult.alternatives,
      totalResults: allListings.length
    };

    // Cache result
    cache.set(cacheKey, response);

    console.log(`\n✅ Search complete - Found ${cheaperResult.alternatives.length} alternatives`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    res.json(response);

  } catch (error) {
    console.error('❌ Search error:', error);
    next(error);
  }
});

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (req, res) => {
  res.json({
    success: true,
    stats: cache.getStats()
  });
});

/**
 * POST /api/cache/flush
 * Flush cache
 */
router.post('/cache/flush', (req, res) => {
  cache.flush();
  res.json({
    success: true,
    message: 'Cache flushed successfully'
  });
});

export default router;
