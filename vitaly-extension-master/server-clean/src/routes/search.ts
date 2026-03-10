import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AliExpressService } from '../services/aliexpress';
import { SearchRequest, SearchResponse, ApiResponse } from '../types';

const router = Router();

// Validation schemas
const searchSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  url: Joi.string().uri().optional(),
  maxResults: Joi.number().integer().min(1).max(20).default(5),
}).xor('title', 'url'); // Either title OR url, not both

/**
 * POST /api/search-product
 * Search for AliExpress products based on Amazon product info
 */
router.post('/search-product', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Validate request body
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: {
          message: 'Invalid request parameters',
          code: 'VALIDATION_ERROR',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    const searchRequest: SearchRequest = value;
    console.log(`🔍 Search request:`, searchRequest);

    // Search AliExpress
    const products = await aliExpressService.searchProducts(searchRequest);

    if (!products || products.length === 0) {
      const response: SearchResponse = {
        success: true,
        data: {
          products: [],
          query: searchRequest.title || searchRequest.url || '',
          total: 0,
        },
        timestamp: new Date().toISOString(),
      };
      return res.json(response);
    }

    const response: SearchResponse = {
      success: true,
      data: {
        products,
        query: searchRequest.title || searchRequest.url || '',
        total: products.length,
      },
      timestamp: new Date().toISOString(),
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Search completed in ${duration}ms, found ${products.length} products`);

    return res.json(response);

  } catch (error) {
    console.error('Search API error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to search products',
        code: 'SEARCH_ERROR',
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(response);
  }
});

/**
 * GET /api/search-health
 * Check search service health
 */
router.get('/search-health', (_req: Request, res: Response) => {
  try {
    const cacheStats = aliExpressService.getCacheStats();
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        service: 'search-api',
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);
  } catch (error) {
    console.error('Health check error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Health check failed',
        code: 'HEALTH_ERROR',
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(response);
  }
});

/**
 * POST /api/clear-cache
 * Clear search cache (admin only)
 */
router.post('/clear-cache', (_req: Request, res: Response) => {
  try {
    aliExpressService.clearCache();
    
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);
  } catch (error) {
    console.error('Cache clear error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        message: 'Failed to clear cache',
        code: 'CACHE_ERROR',
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(response);
  }
});

// Initialize AliExpress service (will be injected from main app)
let aliExpressService: AliExpressService;

export function initializeSearchService(service: AliExpressService): void {
  aliExpressService = service;
}

export default router;
