import express from 'express';
import NodeCache from 'node-cache';
import AliExpressService from '../services/aliexpressService.js';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 180 }); // 3 minute cache for search
const aliExpressService = new AliExpressService();

// Tech & Office niche keywords
const NICHE_KEYWORDS = [
  'ergonomic mouse', 'mechanical keyboard', 'wireless keyboard', 'gaming mouse',
  'USB-C cable', 'charging cable', 'HDMI cable', 'display cable',
  'studio light', 'ring light', 'LED light', 'desk lamp',
  'webcam', 'microphone', 'headset', 'earbuds',
  'laptop stand', 'monitor stand', 'desk organizer', 'cable management',
  'power strip', 'USB hub', 'docking station', 'charger',
  'mouse pad', 'wrist rest', 'foot rest', 'back support'
];

/**
 * GET /api/search?query=xxx&category=tech-office
 * Search for Tech & Office products
 */
router.get('/search', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.query;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: { message: 'Query must be at least 3 characters' }
      });
    }

    const cacheKey = `search:${query.trim()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${query}`);
      return res.json(cached);
    }

    console.log(`[SEARCH] TechOffice: ${query}`);

    // Search AliExpress
    const results = await aliExpressService.searchProducts(query.trim(), {
      maxResults: parseInt(maxResults),
      category: 'tech-office'
    });

    const response = {
      success: true,
      data: {
        query: query.trim(),
        products: results,
        total: results.length,
        niche: 'Tech & Office'
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

/**
 * GET /api/trends
 * Get trending Tech & Office products
 */
router.get('/trends', async (req, res) => {
  try {
    const cacheKey = 'trends:techoffice';
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Search trending keywords
    const trendingProducts = [];
    const sampleKeywords = ['ergonomic mouse', 'mechanical keyboard', 'USB-C hub', 'ring light'];
    
    for (const keyword of sampleKeywords) {
      const results = await aliExpressService.searchProducts(keyword, { maxResults: 3 });
      trendingProducts.push(...results);
    }

    const response = {
      success: true,
      data: {
        products: trendingProducts.slice(0, 12),
        total: trendingProducts.length,
        updated: new Date().toISOString()
      }
    };

    cache.set(cacheKey, response, 600); // 10 min cache
    res.json(response);

  } catch (error) {
    console.error('Trends Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

export default router;
