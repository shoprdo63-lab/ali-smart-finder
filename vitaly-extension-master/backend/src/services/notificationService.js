/**
 * Notification Service
 * Handles price drop alerts, email notifications, and push notifications
 */

const Redis = require('ioredis');
const { Pool } = require('pg');

class NotificationService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'alismart',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
    
    this.emailProvider = process.env.EMAIL_PROVIDER || 'sendgrid';
    this.pushProvider = process.env.PUSH_PROVIDER || 'webpush';
  }

  /**
   * Initialize notification worker
   */
  startWorker() {
    console.log('🔔 Notification worker started');
    
    // Process notification queue every 5 seconds
    setInterval(() => this.processQueue(), 5000);
    
    // Process scheduled notifications every minute
    setInterval(() => this.processScheduled(), 60000);
  }

  /**
   * Add notification to queue
   */
  async queueNotification(notification) {
    const enriched = {
      ...notification,
      id: this.generateId(),
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3
    };
    
    await this.redis.lpush('notifications:queue', JSON.stringify(enriched));
    
    // Also save to database for persistence
    await this.saveNotification(enriched);
    
    return enriched;
  }

  /**
   * Process notification queue
   */
  async processQueue() {
    const batchSize = 10;
    const notifications = [];
    
    // Get batch from queue
    for (let i = 0; i < batchSize; i++) {
      const item = await this.redis.rpop('notifications:queue');
      if (!item) break;
      notifications.push(JSON.parse(item));
    }
    
    // Process each notification
    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
        await this.updateNotificationStatus(notification.id, 'sent');
      } catch (error) {
        console.error('Failed to send notification:', error);
        
        if (notification.attempts < notification.maxAttempts) {
          // Requeue with delay
          notification.attempts++;
          notification.nextAttempt = new Date(Date.now() + 60000 * notification.attempts);
          await this.redis.lpush('notifications:delayed', JSON.stringify(notification));
        } else {
          await this.updateNotificationStatus(notification.id, 'failed', error.message);
        }
      }
    }
  }

  /**
   * Send notification via appropriate channel
   */
  async sendNotification(notification) {
    const { userId, type, channels = ['push', 'email'] } = notification;
    
    // Get user preferences
    const userPrefs = await this.getUserPreferences(userId);
    const enabledChannels = channels.filter(ch => userPrefs[ch] !== false);
    
    const results = [];
    
    for (const channel of enabledChannels) {
      switch (channel) {
        case 'push':
          results.push(await this.sendPushNotification(notification));
          break;
        case 'email':
          results.push(await this.sendEmailNotification(notification));
          break;
        case 'webhook':
          results.push(await this.sendWebhookNotification(notification));
          break;
        case 'sms':
          results.push(await this.sendSMSNotification(notification));
          break;
      }
    }
    
    return results;
  }

  /**
   * Send web push notification
   */
  async sendPushNotification(notification) {
    const { userId, title, message, data = {} } = notification;
    
    // Get user's push subscription
    const subs = await this.db.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 AND active = true',
      [userId]
    );
    
    if (!subs.rows.length) {
      return { channel: 'push', status: 'skipped', reason: 'no_subscription' };
    }
    
    const webpush = require('web-push');
    
    webpush.setVapidDetails(
      'mailto:support@alismart-finder.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    
    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: {
        url: data.url || '/',
        productId: data.productId,
        notificationId: notification.id
      },
      actions: [
        { action: 'view', title: 'View Product' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: true
    });
    
    const results = [];
    
    for (const sub of subs.rows) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        results.push({ device: sub.device_id, status: 'sent' });
      } catch (error) {
        if (error.statusCode === 410) {
          // Subscription expired
          await this.db.query(
            'UPDATE push_subscriptions SET active = false WHERE id = $1',
            [sub.id]
          );
        }
        results.push({ device: sub.device_id, status: 'failed', error: error.message });
      }
    }
    
    return { channel: 'push', status: 'completed', results };
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    const { userId, title, message, data = {} } = notification;
    
    // Get user email
    const user = await this.db.query(
      'SELECT email, preferences FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user.rows.length || !user.rows[0].email) {
      return { channel: 'email', status: 'skipped', reason: 'no_email' };
    }
    
    const { email, preferences } = user.rows[0];
    
    // Check if user wants this type of email
    if (preferences?.email_opt_out?.includes(notification.type)) {
      return { channel: 'email', status: 'skipped', reason: 'opted_out' };
    }
    
    // Build email content
    const emailContent = this.buildEmailTemplate({
      title,
      message,
      ...data,
      unsubscribeUrl: `https://alismart-finder.com/unsubscribe?token=${userId}`
    });
    
    // Send via SendGrid
    if (this.emailProvider === 'sendgrid') {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      await sgMail.send({
        to: email,
        from: 'alerts@alismart-finder.com',
        subject: title,
        html: emailContent,
        trackingSettings: {
          clickTracking: { enable: false }
        }
      });
    }
    
    return { channel: 'email', status: 'sent', recipient: email };
  }

  /**
   * Build HTML email template
   */
  buildEmailTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1419; color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; padding: 30px; background: linear-gradient(135deg, #00d4ff, #0ea5e9); border-radius: 16px 16px 0 0; }
          .header h1 { margin: 0; color: #fff; font-size: 24px; }
          .content { background: #1a1f2e; padding: 30px; border-radius: 0 0 16px 16px; }
          .price-box { background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
          .price { font-size: 36px; font-weight: 700; color: #00d4ff; }
          .savings { color: #10b981; font-size: 18px; margin-top: 10px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #00d4ff, #0ea5e9); color: #0f1419; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
          .footer a { color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 ${data.title}</h1>
          </div>
          <div class="content">
            <p>${data.message}</p>
            
            <div class="price-box">
              <div class="price">$${data.newPrice}</div>
              ${data.oldPrice ? `<div style="text-decoration: line-through; color: #94a3b8;">Was: $${data.oldPrice}</div>` : ''}
              ${data.savings ? `<div class="savings">You save $${data.savings}!</div>` : ''}
            </div>
            
            <center>
              <a href="${data.url || '#'}" class="btn">View Product</a>
            </center>
            
            <p style="color: #94a3b8; font-size: 14px;">
              This alert was triggered because you set a target price of $${data.targetPrice || data.oldPrice}.
            </p>
          </div>
          <div class="footer">
            <p>AliSmart Finder - Smart Shopping for Gamers</p>
            <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="https://alismart-finder.com/preferences">Manage Preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send webhook notification (for integrations)
   */
  async sendWebhookNotification(notification) {
    const { webhookUrl, data } = notification;
    
    if (!webhookUrl) {
      return { channel: 'webhook', status: 'skipped', reason: 'no_url' };
    }
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Notification-Signature': this.generateWebhookSignature(data)
        },
        body: JSON.stringify({
          event: notification.type,
          timestamp: new Date().toISOString(),
          data
        })
      });
      
      return {
        channel: 'webhook',
        status: response.ok ? 'sent' : 'failed',
        statusCode: response.status
      };
    } catch (error) {
      return { channel: 'webhook', status: 'failed', error: error.message };
    }
  }

  /**
   * Generate webhook signature for verification
   */
  generateWebhookSignature(payload) {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET;
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Save notification to database
   */
  async saveNotification(notification) {
    const query = `
      INSERT INTO notifications (
        id, user_id, type, title, message, 
        data, status, channels, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `;
    
    await this.db.query(query, [
      notification.id,
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification.data || {}),
      notification.status,
      JSON.stringify(notification.channels || ['push']),
      notification.createdAt
    ]);
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(id, status, error = null) {
    await this.db.query(
      `UPDATE notifications 
       SET status = $1, error = $2, updated_at = NOW() 
       WHERE id = $3`,
      [status, error, id]
    );
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    const result = await this.db.query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );
    
    const defaults = {
      push: true,
      email: true,
      sms: false,
      webhook: false,
      priceDrop: true,
      restock: true,
      newsletter: false
    };
    
    return { ...defaults, ...(result.rows[0]?.preferences || {}) };
  }

  /**
   * Create price drop alert
   */
  async createPriceAlert(userId, productId, targetPrice, options = {}) {
    const alert = {
      id: this.generateId(),
      userId,
      productId,
      targetPrice,
      alertEnabled: true,
      channels: options.channels || ['push', 'email'],
      createdAt: new Date()
    };
    
    // Check if alert already exists
    const existing = await this.db.query(
      `SELECT id FROM wishlist 
       WHERE user_id = $1 AND product_id = $2 AND target_price = $3`,
      [userId, productId, targetPrice]
    );
    
    if (existing.rows.length) {
      // Update existing
      await this.db.query(
        `UPDATE wishlist 
         SET alert_enabled = true, channels = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(alert.channels), existing.rows[0].id]
      );
      return { ...alert, id: existing.rows[0].id, updated: true };
    }
    
    // Create new alert
    await this.db.query(
      `INSERT INTO wishlist (id, user_id, product_id, target_price, alert_enabled, channels)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [alert.id, userId, productId, targetPrice, true, JSON.stringify(alert.channels)]
    );
    
    return alert;
  }

  /**
   * Get user's notification history
   */
  async getNotificationHistory(userId, options = {}) {
    const { limit = 50, offset = 0, type = null } = options;
    
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    const params = [userId];
    
    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    await this.db.query(
      `UPDATE notifications 
       SET read_at = NOW(), status = 'read'
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  /**
   * Process scheduled notifications
   */
  async processScheduled() {
    // Move delayed notifications back to queue
    const delayed = await this.redis.lrange('notifications:delayed', 0, -1);
    
    const now = Date.now();
    const toRequeue = [];
    const toKeep = [];
    
    for (const item of delayed) {
      const notification = JSON.parse(item);
      if (new Date(notification.nextAttempt).getTime() <= now) {
        toRequeue.push(item);
      } else {
        toKeep.push(item);
      }
    }
    
    // Clear and rebuild delayed queue
    await this.redis.del('notifications:delayed');
    
    for (const item of toKeep) {
      await this.redis.lpush('notifications:delayed', item);
    }
    
    for (const item of toRequeue) {
      await this.redis.lpush('notifications:queue', item);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get notification stats
   */
  async getStats(timeframe = '24h') {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM notifications
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
    `);
    
    return result.rows[0];
  }

  async close() {
    await this.redis.quit();
    await this.db.end();
  }
}

module.exports = NotificationService;
