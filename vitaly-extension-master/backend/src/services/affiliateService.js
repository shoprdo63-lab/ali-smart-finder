/**
 * Affiliate & Cashback Integration Service
 * Manages affiliate links and tracks cashback earnings
 */

const { Pool } = require('pg');
const Redis = require('ioredis');

class AffiliateService {
  constructor() {
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'alismart',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    
    // Affiliate network configurations
    this.networks = {
      amazon: {
        name: 'Amazon Associates',
        tag: process.env.AMAZON_ASSOCIATE_TAG,
        rate: 0.03, // 3% average
        cookieDuration: 24 * 60 * 60, // 24 hours
        urlBuilder: (url, tag) => this.buildAmazonAffiliateUrl(url, tag)
      },
      aliexpress: {
        name: 'AliExpress Affiliate',
        appKey: process.env.ALIEXPRESS_APP_KEY,
        trackingId: process.env.ALIEXPRESS_TRACKING_ID,
        rate: 0.05, // 5% average
        cookieDuration: 30 * 24 * 60 * 60, // 30 days
        urlBuilder: (url, trackingId) => this.buildAliExpressAffiliateUrl(url, trackingId)
      },
      banggood: {
        name: 'Banggood Affiliate',
        param: 'p',
        code: process.env.BANGGOOD_AFFILIATE_CODE,
        rate: 0.06,
        cookieDuration: 30 * 24 * 60 * 60
      },
      dhgate: {
        name: 'DHgate Affiliate',
        code: process.env.DHGATE_AFFILIATE_CODE,
        rate: 0.04,
        cookieDuration: 30 * 24 * 60 * 60
      }
    };
  }

  /**
   * Generate affiliate link for a product
   */
  async generateAffiliateLink(productUrl, network, userId = null) {
    const config = this.networks[network];
    
    if (!config) {
      throw new Error(`Unknown affiliate network: ${network}`);
    }
    
    // Build affiliate URL
    let affiliateUrl;
    switch (network) {
      case 'amazon':
        affiliateUrl = config.urlBuilder(productUrl, config.tag);
        break;
      case 'aliexpress':
        affiliateUrl = config.urlBuilder(productUrl, config.trackingId);
        break;
      case 'banggood':
        affiliateUrl = this.buildGenericAffiliateUrl(productUrl, config);
        break;
      case 'dhgate':
        affiliateUrl = this.buildGenericAffiliateUrl(productUrl, config);
        break;
      default:
        affiliateUrl = productUrl;
    }
    
    // Track click
    await this.trackClick(userId, network, productUrl, affiliateUrl);
    
    return {
      originalUrl: productUrl,
      affiliateUrl,
      network: config.name,
      estimatedRate: config.rate,
      cookieDuration: config.cookieDuration
    };
  }

  /**
   * Build Amazon affiliate URL
   */
  buildAmazonAffiliateUrl(originalUrl, tag) {
    try {
      const url = new URL(originalUrl);
      
      // Remove existing tag
      url.searchParams.delete('tag');
      
      // Add affiliate tag
      url.searchParams.set('tag', tag);
      
      // Add tracking ID
      url.searchParams.set('linkId', this.generateId());
      
      return url.toString();
    } catch (error) {
      // Fallback: append tag as query parameter
      const separator = originalUrl.includes('?') ? '&' : '?';
      return `${originalUrl}${separator}tag=${tag}`;
    }
  }

  /**
   * Build AliExpress affiliate URL
   */
  buildAliExpressAffiliateUrl(originalUrl, trackingId) {
    // AliExpress uses a redirect URL format
    const deeplink = encodeURIComponent(originalUrl);
    return `https://s.click.aliexpress.com/deeplink.htm?dl_target_url=${deeplink}&af=${trackingId}`;
  }

  /**
   * Build generic affiliate URL
   */
  buildGenericAffiliateUrl(originalUrl, config) {
    try {
      const url = new URL(originalUrl);
      url.searchParams.set(config.param || 'aff', config.code);
      return url.toString();
    } catch (error) {
      const separator = originalUrl.includes('?') ? '&' : '?';
      return `${originalUrl}${separator}${config.param || 'aff'}=${config.code}`;
    }
  }

  /**
   * Track affiliate link click
   */
  async trackClick(userId, network, originalUrl, affiliateUrl) {
    const clickId = this.generateId();
    
    // Store click data in Redis (temporary)
    await this.redis.setex(
      `click:${clickId}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify({
        userId,
        network,
        originalUrl,
        affiliateUrl,
        clickedAt: new Date(),
        converted: false
      })
    );
    
    // Also save to database
    await this.db.query(
      `INSERT INTO affiliate_clicks (id, user_id, network, original_url, affiliate_url, clicked_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [clickId, userId, network, originalUrl, affiliateUrl]
    );
    
    return clickId;
  }

  /**
   * Record conversion (purchase)
   */
  async recordConversion(clickId, orderData) {
    const clickData = await this.redis.get(`click:${clickId}`);
    
    if (!clickData) {
      console.warn('Click not found for conversion:', clickId);
      return null;
    }
    
    const click = JSON.parse(clickData);
    const config = this.networks[click.network];
    
    // Calculate commission
    const commission = orderData.amount * (config?.rate || 0.03);
    
    const conversion = {
      id: this.generateId(),
      clickId,
      userId: click.userId,
      network: click.network,
      orderAmount: orderData.amount,
      commission,
      currency: orderData.currency || 'USD',
      status: 'pending', // pending, confirmed, rejected
      orderDate: new Date(),
      confirmedDate: null
    };
    
    // Save to database
    await this.db.query(
      `INSERT INTO affiliate_conversions (
        id, click_id, user_id, network, order_amount, commission, 
        currency, status, order_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        conversion.id,
        clickId,
        conversion.userId,
        conversion.network,
        conversion.orderAmount,
        conversion.commission,
        conversion.currency,
        conversion.status
      ]
    );
    
    // Update click as converted
    await this.redis.setex(
      `click:${clickId}`,
      30 * 24 * 60 * 60,
      JSON.stringify({ ...click, converted: true, conversionId: conversion.id })
    );
    
    // Update user's pending cashback
    if (conversion.userId) {
      await this.updateUserCashback(conversion.userId, commission);
    }
    
    return conversion;
  }

  /**
   * Update user's pending cashback balance
   */
  async updateUserCashback(userId, amount) {
    const key = `cashback:pending:${userId}`;
    await this.redis.incrbyfloat(key, amount);
    
    // Also update database
    await this.db.query(
      `UPDATE users 
       SET cashback_pending = cashback_pending + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, userId]
    );
  }

  /**
   * Get user's cashback stats
   */
  async getCashbackStats(userId) {
    const result = await this.db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN commission ELSE 0 END), 0) as confirmed,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN commission ELSE 0 END), 0) as rejected,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
       FROM affiliate_conversions
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = result.rows[0];
    
    return {
      confirmed: parseFloat(stats.confirmed) || 0,
      pending: parseFloat(stats.pending) || 0,
      rejected: parseFloat(stats.rejected) || 0,
      confirmedOrders: parseInt(stats.confirmed_orders) || 0,
      pendingOrders: parseInt(stats.pending_orders) || 0,
      totalEarned: parseFloat(stats.confirmed) || 0,
      availableForWithdrawal: parseFloat(stats.confirmed) || 0
    };
  }

  /**
   * Get user's conversion history
   */
  async getConversionHistory(userId, options = {}) {
    const { limit = 50, offset = 0, status = null } = options;
    
    let query = `
      SELECT ac.*, 
             ac.clicked_at,
             ac.original_url,
             p.title as product_title
      FROM affiliate_conversions ac
      LEFT JOIN affiliate_clicks acc ON ac.click_id = acc.id
      LEFT JOIN products p ON (acc.original_url LIKE '%' || p.amazon_asin || '%' 
                                OR acc.original_url LIKE '%' || p.aliexpress_id || '%')
      WHERE ac.user_id = $1
    `;
    const params = [userId];
    
    if (status) {
      query += ` AND ac.status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY ac.order_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Confirm conversions (after return period expires)
   */
  async confirmConversions() {
    // Confirm conversions older than 30 days (typical return window)
    const result = await this.db.query(
      `UPDATE affiliate_conversions
       SET status = 'confirmed', confirmed_date = NOW()
       WHERE status = 'pending'
       AND order_date < NOW() - INTERVAL '30 days'
       RETURNING user_id, commission`
    );
    
    // Update user confirmed balances
    for (const row of result.rows) {
      await this.db.query(
        `UPDATE users 
         SET cashback_confirmed = cashback_confirmed + $1,
             cashback_pending = cashback_pending - $1
         WHERE id = $2`,
        [row.commission, row.user_id]
      );
    }
    
    return result.rowCount;
  }

  /**
   * Request cashback withdrawal
   */
  async requestWithdrawal(userId, amount, method = 'paypal') {
    // Check available balance
    const stats = await this.getCashbackStats(userId);
    
    if (stats.confirmed < amount) {
      throw new Error('Insufficient confirmed cashback balance');
    }
    
    if (amount < 10) {
      throw new Error('Minimum withdrawal amount is $10');
    }
    
    const withdrawalId = this.generateId();
    
    await this.db.query(
      `INSERT INTO cashback_withdrawals (id, user_id, amount, method, status, requested_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())`,
      [withdrawalId, userId, amount, method]
    );
    
    // Reserve the amount
    await this.db.query(
      `UPDATE users 
       SET cashback_confirmed = cashback_confirmed - $1
       WHERE id = $2`,
      [amount, userId]
    );
    
    return {
      id: withdrawalId,
      amount,
      method,
      status: 'pending',
      estimatedProcessing: '3-5 business days'
    };
  }

  /**
   * Get affiliate links for price comparison
   */
  async getComparisonAffiliateLinks(productUrls) {
    const links = {};
    
    for (const [source, url] of Object.entries(productUrls)) {
      try {
        links[source] = await this.generateAffiliateLink(url, source);
      } catch (error) {
        console.warn(`Failed to generate ${source} affiliate link:`, error.message);
        links[source] = { originalUrl: url, affiliateUrl: url, error: true };
      }
    }
    
    return links;
  }

  /**
   * Get estimated earnings for a product
   */
  getEstimatedEarnings(price, network) {
    const config = this.networks[network];
    
    if (!config) {
      return null;
    }
    
    const commission = price * config.rate;
    
    return {
      estimatedCommission: commission.toFixed(2),
      rate: (config.rate * 100).toFixed(1) + '%',
      network: config.name,
      disclaimer: 'Estimated earnings. Actual commission may vary.'
    };
  }

  /**
   * Track batch clicks for analytics
   */
  async trackBatchClicks(clicks) {
    const values = clicks.map(click => [
      this.generateId(),
      click.userId,
      click.network,
      click.url,
      click.affiliateUrl,
      new Date()
    ]);
    
    const query = `
      INSERT INTO affiliate_clicks (id, user_id, network, original_url, affiliate_url, clicked_at)
      VALUES ${values.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(',')}
    `;
    
    await this.db.query(query, values.flat());
  }

  /**
   * Get affiliate performance stats
   */
  async getPerformanceStats(startDate, endDate) {
    const result = await this.db.query(
      `SELECT 
        network,
        COUNT(*) as clicks,
        COUNT(CASE WHEN converted THEN 1 END) as conversions,
        SUM(CASE WHEN ac.status = 'confirmed' THEN ac.commission ELSE 0 END) as confirmed_revenue,
        SUM(CASE WHEN ac.status = 'pending' THEN ac.commission ELSE 0 END) as pending_revenue
       FROM affiliate_clicks acc
       LEFT JOIN affiliate_conversions ac ON ac.click_id = acc.id
       WHERE acc.clicked_at BETWEEN $1 AND $2
       GROUP BY network`,
      [startDate, endDate]
    );
    
    return result.rows.map(row => ({
      network: row.network,
      clicks: parseInt(row.clicks),
      conversions: parseInt(row.conversions),
      conversionRate: ((parseInt(row.conversions) / parseInt(row.clicks)) * 100).toFixed(2) + '%',
      confirmedRevenue: parseFloat(row.confirmed_revenue) || 0,
      pendingRevenue: parseFloat(row.pending_revenue) || 0
    }));
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async close() {
    await this.db.end();
    await this.redis.quit();
  }
}

module.exports = AffiliateService;
