/**
 * Price History Service
 * Tracks and analyzes price changes over time
 */

const { Pool } = require('pg');
const Redis = require('ioredis');

class PriceHistoryService {
  constructor() {
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'alismart',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100
    });
    
    this.CACHE_TTL = 3600; // 1 hour
  }

  /**
   * Record a new price point
   */
  async recordPrice(productId, source, priceData) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert price history
      const query = `
        INSERT INTO price_history (
          product_id, source, price, shipping_cost, 
          currency, taxes, total_cost, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        productId,
        source,
        priceData.price,
        priceData.shipping || 0,
        priceData.currency || 'USD',
        priceData.taxes || 0,
        priceData.total || priceData.price + (priceData.shipping || 0),
        JSON.stringify(priceData.metadata || {})
      ];
      
      const result = await client.query(query, values);
      
      // Update cache
      await this.updatePriceCache(productId, source, priceData);
      
      // Check for price drops and trigger alerts
      await this.checkPriceAlerts(productId, priceData);
      
      await client.query('COMMIT');
      
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording price:', error);
      throw error;
      
    } finally {
      client.release();
    }
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId, options = {}) {
    const {
      days = 180,
      source = null,
      granularity = 'day' // day, week, month
    } = options;
    
    // Check cache first
    const cacheKey = `price_history:${productId}:${days}:${source || 'all'}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Build query
    let query = `
      SELECT 
        DATE_TRUNC($1, recorded_at) as period,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(total_cost) as avg_total,
        MIN(total_cost) as min_total,
        MAX(total_cost) as max_total,
        COUNT(*) as data_points,
        source
      FROM price_history
      WHERE product_id = $2
      AND recorded_at >= NOW() - INTERVAL '${days} days'
    `;
    
    const params = [granularity, productId];
    
    if (source) {
      query += ' AND source = $3';
      params.push(source);
    }
    
    query += `
      GROUP BY DATE_TRUNC($1, recorded_at), source
      ORDER BY period DESC
    `;
    
    const result = await this.db.query(query, params);
    
    // Format results
    const history = result.rows.map(row => ({
      date: row.period,
      avgPrice: parseFloat(row.avg_price),
      minPrice: parseFloat(row.min_price),
      maxPrice: parseFloat(row.max_price),
      avgTotal: parseFloat(row.avg_total),
      minTotal: parseFloat(row.min_total),
      maxTotal: parseFloat(row.max_total),
      dataPoints: parseInt(row.data_points),
      source: row.source
    }));
    
    // Add statistics
    const stats = this.calculateStats(history);
    
    const response = {
      productId,
      history,
      statistics: stats,
      period: {
        from: history[history.length - 1]?.date,
        to: history[0]?.date,
        days
      }
    };
    
    // Cache results
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(response));
    
    return response;
  }

  /**
   * Calculate price statistics
   */
  calculateStats(history) {
    if (!history.length) return null;
    
    const prices = history.map(h => h.avgPrice);
    const totals = history.map(h => h.avgTotal);
    
    const current = history[0];
    const lowest = history.reduce((min, h) => h.minPrice < min.minPrice ? h : min, history[0]);
    const highest = history.reduce((max, h) => h.maxPrice > max.maxPrice ? h : max, history[0]);
    
    // Calculate trend
    const firstPrice = history[history.length - 1]?.avgPrice;
    const lastPrice = current.avgPrice;
    const trend = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    return {
      current: {
        avgPrice: current.avgPrice,
        total: current.avgTotal
      },
      lowest: {
        price: lowest.minPrice,
        date: lowest.date,
        total: lowest.minTotal
      },
      highest: {
        price: highest.maxPrice,
        date: highest.date,
        total: highest.maxTotal
      },
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      trend: {
        direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
        percentage: Math.abs(trend).toFixed(2),
        absolute: lastPrice - firstPrice
      },
      volatility: this.calculateVolatility(prices),
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      }
    };
  }

  /**
   * Calculate price volatility (standard deviation)
   */
  calculateVolatility(prices) {
    const n = prices.length;
    if (n < 2) return 0;
    
    const mean = prices.reduce((a, b) => a + b, 0) / n;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Return coefficient of variation (normalized)
    return ((stdDev / mean) * 100).toFixed(2);
  }

  /**
   * Get best time to buy prediction
   */
  async getBuyRecommendation(productId) {
    const history = await this.getPriceHistory(productId, { days: 90 });
    
    if (!history.history.length) {
      return { recommendation: 'no_data', reason: 'Insufficient price history' };
    }
    
    const stats = history.statistics;
    const current = stats.current.avgPrice;
    const lowest = stats.lowest.price;
    const average = stats.average;
    
    // Recommendation logic
    let recommendation, confidence, reason;
    
    const diffFromLowest = ((current - lowest) / lowest) * 100;
    const diffFromAverage = ((current - average) / average) * 100;
    
    if (diffFromLowest <= 5) {
      recommendation = 'buy_now';
      confidence = 'high';
      reason = `Price is within 5% of 90-day low ($${lowest.toFixed(2)})`;
    } else if (stats.trend.direction === 'down' && parseFloat(stats.trend.percentage) > 10) {
      recommendation = 'wait';
      confidence = 'medium';
      reason = `Price is trending down ${stats.trend.percentage}% over 90 days`;
    } else if (diffFromAverage > 15) {
      recommendation = 'wait';
      confidence = 'medium';
      reason = `Current price is ${diffFromAverage.toFixed(1)}% above average`;
    } else {
      recommendation = 'fair';
      confidence = 'medium';
      reason = 'Price is at typical level';
    }
    
    return {
      recommendation,
      confidence,
      reason,
      currentPrice: current,
      targetPrice: lowest,
      potentialSavings: (current - lowest).toFixed(2),
      stats
    };
  }

  /**
   * Check and trigger price alerts
   */
  async checkPriceAlerts(productId, currentPrice) {
    // Get all active alerts for this product
    const alertsQuery = `
      SELECT wa.*, p.amazon_asin, p.title
      FROM wishlist wa
      JOIN products p ON wa.product_id = p.id
      WHERE wa.product_id = $1
      AND wa.alert_enabled = true
      AND wa.target_price >= $2
    `;
    
    const alerts = await this.db.query(alertsQuery, [productId, currentPrice.total]);
    
    for (const alert of alerts.rows) {
      // Trigger notification
      await this.triggerPriceDropAlert(alert, currentPrice);
    }
    
    return alerts.rows.length;
  }

  /**
   * Trigger price drop notification
   */
  async triggerPriceDropAlert(alert, price) {
    const notification = {
      userId: alert.user_id,
      type: 'price_drop',
      title: '💰 Price Drop Alert!',
      message: `${alert.title} is now $${price.total} (target: $${alert.target_price})`,
      data: {
        productId: alert.product_id,
        oldPrice: alert.target_price,
        newPrice: price.total,
        url: price.url
      },
      createdAt: new Date()
    };
    
    // Add to notification queue
    await this.redis.lpush('notifications:queue', JSON.stringify(notification));
    
    // Update alert last triggered
    await this.db.query(
      'UPDATE wishlist SET last_alert_at = NOW() WHERE id = $1',
      [alert.id]
    );
    
    return notification;
  }

  /**
   * Update price cache
   */
  async updatePriceCache(productId, source, priceData) {
    const cacheKey = `current_price:${productId}:${source}`;
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify({
      price: priceData.price,
      total: priceData.total,
      updatedAt: new Date()
    }));
  }

  /**
   * Get current price from cache
   */
  async getCurrentPrice(productId, source) {
    const cacheKey = `current_price:${productId}:${source}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fallback to DB
    const result = await this.db.query(
      `SELECT price, total_cost as total
       FROM price_history
       WHERE product_id = $1 AND source = $2
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [productId, source]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get price comparison between sources
   */
  async getPriceComparison(productId, sources = ['amazon', 'aliexpress']) {
    const comparison = {};
    
    for (const source of sources) {
      const price = await this.getCurrentPrice(productId, source);
      if (price) {
        comparison[source] = price;
      }
    }
    
    // Calculate best deal
    const prices = Object.entries(comparison)
      .filter(([_, p]) => p && p.total)
      .map(([source, p]) => ({ source, total: p.total }));
    
    if (prices.length > 1) {
      const best = prices.reduce((min, p) => p.total < min.total ? p : min);
      comparison.bestDeal = best;
      
      // Calculate savings vs best
      prices.forEach(p => {
        if (p.source !== best.source) {
          p.savings = p.total - best.total;
          p.savingsPercent = ((p.savings / p.total) * 100).toFixed(1);
        }
      });
    }
    
    return comparison;
  }

  /**
   * Clean up old price data (archival)
   */
  async archiveOldData(days = 365) {
    const query = `
      DELETE FROM price_history
      WHERE recorded_at < NOW() - INTERVAL '${days} days'
      RETURNING COUNT(*)
    `;
    
    const result = await this.db.query(query);
    return result.rows[0].count;
  }

  /**
   * Close connections
   */
  async close() {
    await this.db.end();
    await this.redis.quit();
  }
}

module.exports = PriceHistoryService;
