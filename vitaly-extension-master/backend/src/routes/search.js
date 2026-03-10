import express from 'express';
import AliExpressService from '../services/aliexpressService.js';
import NodeCache from 'node-cache';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 300 });
const aliService = new AliExpressService();

/**
 * Estimate shipping cost based on product price
 */
function estimateShipping(price) {
  if (price < 5) return 0;      // Free shipping on cheap items
  if (price < 20) return 1.99;
  if (price < 50) return 2.99;
  if (price < 100) return 3.99;
  return 0;                      // Free shipping on expensive items
}

/**
 * Calculate total cost including shipping, import duty, payment fee
 */
function calcTotalCost(price, shipping) {
  const duty = price * 0.05;    // ~5% import duty
  const fee  = price * 0.02;    // ~2% payment fee
  return parseFloat((price + shipping + duty + fee).toFixed(2));
}

/**
 * Calculate match confidence between Amazon title and AliExpress title
 */
function matchConfidence(query, aliTitle) {
  if (!aliTitle) return 0.5;
  const q = query.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const t = aliTitle.toLowerCase();
  const hits = q.filter(w => t.includes(w)).length;
  return Math.min(1, hits / Math.max(q.length, 1));
}

/**
 * Generate mock coupon for gaming/tech products (demo)
 */
function getCoupon(price) {
  if (price > 50)  return { code: 'GAME10', savings: (price * 0.10).toFixed(2), desc: '10% off gaming' };
  if (price > 20)  return { code: 'TECH5',  savings: (price * 0.05).toFixed(2), desc: '5% off tech'    };
  return null;
}

/**
 * GET /api/search?query=...&amazonPrice=...&asin=...
 */
router.get('/search', async (req, res, next) => {
  try {
    const { query, amazonPrice, asin } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ success: false, error: { message: 'query must be >= 3 chars' } });
    }

    const cleanQuery = query.trim();
    const cacheKey = `search:${cleanQuery}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: ${cleanQuery}`);
      return res.json(cached);
    }

    console.log(`🔍 Searching: ${cleanQuery}`);
    console.log(`📤 Query sent to searchProducts:`, cleanQuery);

    // Primary search
    const primary = await aliService.searchProducts(cleanQuery);

    // Run 2 extra parallel searches for alternatives (shorter queries)
    const words = cleanQuery.split(' ').slice(0, 3).join(' ');
    const [alt1, alt2] = await Promise.allSettled([
      aliService.searchProducts(words + ' gaming'),
      aliService.searchProducts(words)
    ]);

    const altResults = [alt1, alt2]
      .filter(r => r.status === 'fulfilled' && r.value && r.value.price > 0)
      .map(r => r.value)
      .filter(r => r.affiliateUrl !== primary.affiliateUrl)
      .slice(0, 3)
      .map(r => ({ title: r.title, price: r.price, url: r.affiliateUrl, image: r.image }));

    const basePrice = parseFloat(primary.price) || 0;
    const shipping  = estimateShipping(basePrice);
    const totalCost = calcTotalCost(basePrice, shipping);
    const amzP      = parseFloat(amazonPrice) || 0;
    const savings   = amzP > 0 ? parseFloat((amzP - totalCost).toFixed(2)) : null;
    const confidence = matchConfidence(cleanQuery, primary.title);
    const coupon     = getCoupon(basePrice);

    // Always return results, even if not cheaper (user can decide)
    if (amzP > 0 && totalCost >= amzP) {
      console.log(`⚠️  AliExpress not cheaper: $${totalCost} (incl.shipping) >= $${amzP} (Amazon) - showing anyway`);
    }

    const response = {
      success: true,
      data: {
        // Prices
        aliPrice:        basePrice,
        shipping:        shipping,
        totalCost:       totalCost,
        originalPrice:   primary.originalPrice || 0,
        savings:         savings,
        savingsPct:      amzP > 0 ? parseFloat(((savings / amzP) * 100).toFixed(1)) : null,
        // Product info
        aliUrl:          primary.affiliateUrl,
        url:             primary.affiliateUrl,
        affiliateUrl:    primary.affiliateUrl,
        title:           primary.title,
        aliTitle:        primary.title,
        image:           primary.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(primary.title.substring(0, 20))}&background=667eea&color=fff&size=200&bold=true`,
        discount:        primary.discount || 0,
        // Seller
        rating:          primary.rating || 4.5,
        orders:          primary.orders || 0,
        seller:          primary.seller || 'AliExpress Store',
        // Match quality
        matchConfidence: confidence,
        similarity:      primary.similarity || 0,
        // Extras
        coupon:          coupon,
        alternatives:    altResults,
        asin:            asin || null,
        cachedAt:        new Date().toISOString()
      }
    };

    cache.set(cacheKey, response);
    console.log(`✅ Result: $${basePrice} (total $${totalCost}) | confidence: ${(confidence*100).toFixed(0)}%`);
    res.json(response);

  } catch (error) {
    console.error('Search error:', error);
    next(error);
  }
});

/**
 * GET /api/price-history/:asin?days=30
 * Returns mock price history (replace with real DB query when available)
 */
router.get('/price-history/:asin', async (req, res) => {
  const { asin } = req.params;
  const days = parseInt(req.query.days) || 30;

  // Generate deterministic mock history based on ASIN hash
  const seed = asin.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const basePrice = 20 + (seed % 80);

  const history = [];
  let price = basePrice;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price += (Math.random() - 0.5) * basePrice * 0.06;
    price  = Math.max(basePrice * 0.75, Math.min(basePrice * 1.3, price));
    history.push({ date: date.toISOString().split('T')[0], price: parseFloat(price.toFixed(2)) });
  }

  res.json({
    success: true,
    data: { asin, days, history, low: Math.min(...history.map(h=>h.price)).toFixed(2), high: Math.max(...history.map(h=>h.price)).toFixed(2) }
  });
});

export default router;
