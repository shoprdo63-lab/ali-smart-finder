import { Router } from 'express';
import { z } from 'zod';
import { ProfitCalculator } from '../services/profit.js';
import { AliExpressScraper } from '../services/scraper.js';
import { NicheFilter } from '../services/niche-filter.js';
import { logger } from '../utils/logger.js';

const router = Router();
const profitCalculator = new ProfitCalculator();
const scraper = new AliExpressScraper();
const nicheFilter = new NicheFilter();

/**
 * Request validation schemas
 */
const findSchema = z.object({
  asin: z.string().min(10).max(10).regex(/^[A-Z0-9]+$/),
  title: z.string().min(3).max(500).optional(),
  category: z.string().optional(),
  price: z.number().positive().optional(),
});

const imagesSchema = z.object({
  asin: z.string().min(10).max(10),
  imageUrls: z.array(z.string().url()).min(1).max(20),
});

/**
 * POST /api/v1/find
 * Find AliExpress matches for an Amazon product
 * [cite: 2026-02-26, 2026-01-25] - Backend logic and profit calculation
 */
router.post('/find', async (req, res) => {
  try {
    const validation = findSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.issues,
      });
      return;
    }
    
    const { asin, title, category, price } = validation.data;
    
    logger.info({ asin, title }, 'Processing find request');
    
    // Check if product is in approved niche
    const nicheCheck = nicheFilter.validateProduct(title || '', category || '');
    
    if (!nicheCheck.allowed) {
      logger.info({ asin, reason: nicheCheck.reason }, 'Product rejected by niche filter');
      res.status(403).json({
        success: false,
        error: 'Product category not supported',
        reason: nicheCheck.reason,
        category: nicheCheck.detectedCategory,
      });
      return;
    }
    
    // Scrape AliExpress for matches
    const searchQuery = title || asin;
    const aliResults = await scraper.searchProducts(searchQuery);
    
    if (!aliResults || aliResults.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No matching products found on AliExpress',
      });
      return;
    }
    
    // Get best match (first result with highest relevance)
    const bestMatch = aliResults[0];
    
    // Calculate profit if we have Amazon price
    let profitAnalysis = null;
    if (price) {
      profitAnalysis = profitCalculator.calculate({
        amazonPrice: price,
        aliPrice: bestMatch.price,
        category: nicheCheck.detectedCategory || 'general',
      });
    }
    
    // Build affiliate link (server-side only)
    const affiliateUrl = scraper.buildAffiliateLink(bestMatch.productUrl);
    
    res.json({
      success: true,
      data: {
        asin,
        matched: true,
        aliExpress: {
          title: bestMatch.title,
          price: bestMatch.price,
          originalPrice: bestMatch.originalPrice,
          currency: bestMatch.currency,
          image: bestMatch.image,
          rating: bestMatch.rating,
          orders: bestMatch.orders,
          productUrl: affiliateUrl,
          shippingEstimate: bestMatch.shippingEstimate,
        },
        profit: profitAnalysis,
        niche: {
          category: nicheCheck.detectedCategory,
          confidence: nicheCheck.confidence,
        },
        alternatives: aliResults.slice(1, 4).map(r => ({
          title: r.title.substring(0, 100),
          price: r.price,
          productUrl: scraper.buildAffiliateLink(r.productUrl),
        })),
      },
    });
    
  } catch (error) {
    logger.error({ error, body: req.body }, 'Error in find endpoint');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/find
 * Alternative GET endpoint for find
 */
router.get('/find', async (req, res) => {
  try {
    const { asin, title, price, category } = req.query;
    
    if (!asin || typeof asin !== 'string') {
      res.status(400).json({
        success: false,
        error: 'ASIN parameter is required',
      });
      return;
    }
    
    // Forward to POST handler logic
    req.body = {
      asin,
      title: title || undefined,
      price: price ? parseFloat(price as string) : undefined,
      category: category || undefined,
    };
    
    // Re-use POST handler
    router.handle(req, res, () => {});
    
  } catch (error) {
    logger.error({ error, query: req.query }, 'Error in find GET endpoint');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/images
 * Proxy images for download (bypasses CORS)
 * [cite: 2026-02-26, 2026-01-23] - Image download feature
 */
router.post('/images', async (req, res) => {
  try {
    const validation = imagesSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid image data',
      });
      return;
    }
    
    const { asin, imageUrls } = validation.data;
    
    logger.info({ asin, count: imageUrls.length }, 'Processing image download request');
    
    // Fetch and proxy images
    const proxyUrls = await scraper.proxyImages(imageUrls);
    
    res.json({
      success: true,
      data: {
        asin,
        images: proxyUrls,
        count: proxyUrls.length,
      },
    });
    
  } catch (error) {
    logger.error({ error }, 'Error in images endpoint');
    res.status(500).json({
      success: false,
      error: 'Failed to process images',
    });
  }
});

/**
 * GET /api/v1/health
 * Extended health check
 */
router.get('/health', async (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      scraper: scraper.isHealthy(),
      profitCalculator: true,
      nicheFilter: true,
    },
  });
});

export { router as apiRouter };
