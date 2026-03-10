/**
 * Cloud Sync Service for Wishlist
 * Syncs wishlist data across devices with conflict resolution
 */

const { Pool } = require('pg');
const Redis = require('ioredis');

class CloudSyncService {
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
    
    this.SYNC_VERSION = '1.0';
  }

  /**
   * Sync wishlist from device to cloud
   */
  async syncWishlist(userId, deviceId, localData, options = {}) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get last sync timestamp for this device
      const lastSync = await this.getLastSync(userId, deviceId);
      
      // Get cloud wishlist
      const cloudWishlist = await this.getCloudWishlist(userId);
      
      // Merge local and cloud data
      const merged = this.mergeWishlists(cloudWishlist, localData, {
        lastSync,
        strategy: options.conflictStrategy || 'newest',
        deviceId
      });
      
      // Save merged data to cloud
      await this.saveCloudWishlist(userId, merged.items, client);
      
      // Record sync
      const syncRecord = await this.recordSync(userId, deviceId, {
        direction: 'upload',
        itemsCount: merged.items.length,
        conflicts: merged.conflicts,
        version: this.SYNC_VERSION
      }, client);
      
      // Update device list
      await this.updateDevice(userId, deviceId, {
        lastSync: new Date(),
        syncVersion: this.SYNC_VERSION
      }, client);
      
      await client.query('COMMIT');
      
      // Invalidate cache
      await this.invalidateWishlistCache(userId);
      
      return {
        success: true,
        items: merged.items,
        conflicts: merged.conflicts,
        syncId: syncRecord.id,
        serverTimestamp: new Date().toISOString()
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get wishlist for device (with sync)
   */
  async getWishlist(userId, deviceId, options = {}) {
    // Check cache first
    const cacheKey = `wishlist:${userId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached && !options.skipCache) {
      const data = JSON.parse(cached);
      return {
        items: data.items,
        serverTimestamp: data.timestamp,
        fromCache: true
      };
    }
    
    // Get from database
    const result = await this.db.query(
      `SELECT w.*, 
              p.title as product_title,
              p.image_url as product_image,
              p.amazon_asin,
              p.aliexpress_id,
              ph.price as current_price,
              ph.total_cost as current_total
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       LEFT JOIN LATERAL (
         SELECT price, total_cost
         FROM price_history
         WHERE product_id = w.product_id AND source = 'aliexpress'
         ORDER BY recorded_at DESC
         LIMIT 1
       ) ph ON true
       WHERE w.user_id = $1 AND w.deleted = false
       ORDER BY w.created_at DESC`,
      [userId]
    );
    
    const items = result.rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      product: {
        id: row.product_id,
        title: row.product_title,
        image: row.product_image,
        amazonAsin: row.amazon_asin,
        aliexpressId: row.aliexpress_id
      },
      targetPrice: row.target_price,
      currentPrice: row.current_price,
      currentTotal: row.current_total,
      alertEnabled: row.alert_enabled,
      notes: row.notes,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify({
      items,
      timestamp: new Date().toISOString()
    }));
    
    return {
      items,
      serverTimestamp: new Date().toISOString(),
      fromCache: false
    };
  }

  /**
   * Add item to wishlist
   */
  async addToWishlist(userId, item, deviceId) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if product exists, create if not
      let productId = item.productId;
      
      if (!productId && item.amazonAsin) {
        const product = await this.getOrCreateProduct({
          amazonAsin: item.amazonAsin,
          title: item.title,
          image: item.image,
          specs: item.specs
        }, client);
        productId = product.id;
      }
      
      // Check if already in wishlist
      const existing = await client.query(
        `SELECT id FROM wishlist 
         WHERE user_id = $1 AND product_id = $2 AND deleted = false`,
        [userId, productId]
      );
      
      if (existing.rows.length) {
        // Update existing
        const updated = await client.query(
          `UPDATE wishlist 
           SET target_price = $1, 
               alert_enabled = $2,
               notes = $3,
               tags = $4,
               updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [
            item.targetPrice,
            item.alertEnabled !== false,
            item.notes || null,
            JSON.stringify(item.tags || []),
            existing.rows[0].id
          ]
        );
        
        await client.query('COMMIT');
        await this.invalidateWishlistCache(userId);
        
        return {
          success: true,
          item: updated.rows[0],
          action: 'updated'
        };
      }
      
      // Create new wishlist item
      const id = this.generateId();
      const result = await client.query(
        `INSERT INTO wishlist (
          id, user_id, product_id, target_price, 
          alert_enabled, channels, notes, tags, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          id,
          userId,
          productId,
          item.targetPrice || null,
          item.alertEnabled !== false,
          JSON.stringify(item.channels || ['push', 'email']),
          item.notes || null,
          JSON.stringify(item.tags || [])
        ]
      );
      
      // Record initial price
      if (item.currentPrice) {
        await client.query(
          `INSERT INTO price_history (product_id, source, price, total_cost, recorded_at)
           VALUES ($1, 'aliexpress', $2, $3, NOW())`,
          [productId, item.currentPrice, item.currentTotal || item.currentPrice]
        );
      }
      
      // Record sync
      await this.recordSync(userId, deviceId, {
        direction: 'add',
        itemId: id,
        version: this.SYNC_VERSION
      }, client);
      
      await client.query('COMMIT');
      await this.invalidateWishlistCache(userId);
      
      return {
        success: true,
        item: result.rows[0],
        action: 'added'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeFromWishlist(userId, wishlistId, deviceId) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Soft delete
      await client.query(
        `UPDATE wishlist 
         SET deleted = true, deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [wishlistId, userId]
      );
      
      // Record sync
      await this.recordSync(userId, deviceId, {
        direction: 'delete',
        itemId: wishlistId,
        version: this.SYNC_VERSION
      }, client);
      
      await client.query('COMMIT');
      await this.invalidateWishlistCache(userId);
      
      return { success: true, action: 'deleted' };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Merge wishlists with conflict resolution
   */
  mergeWishlists(cloudItems, localItems, options = {}) {
    const { strategy = 'newest', lastSync, deviceId } = options;
    const merged = new Map();
    const conflicts = [];
    
    // Add cloud items
    for (const item of cloudItems) {
      merged.set(item.id, { ...item, source: 'cloud' });
    }
    
    // Merge local items
    for (const localItem of localItems) {
      const existing = merged.get(localItem.id);
      
      if (!existing) {
        // New local item
        merged.set(localItem.id, { ...localItem, source: 'local', isNew: true });
      } else {
        // Conflict exists
        const cloudUpdated = new Date(existing.updatedAt).getTime();
        const localUpdated = new Date(localItem.updatedAt).getTime();
        const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
        
        // Both changed since last sync - conflict
        if (cloudUpdated > lastSyncTime && localUpdated > lastSyncTime) {
          conflicts.push({
            itemId: localItem.id,
            cloudVersion: existing,
            localVersion: localItem
          });
          
          // Resolve based on strategy
          let winner;
          switch (strategy) {
            case 'newest':
              winner = localUpdated > cloudUpdated ? localItem : existing;
              break;
            case 'cloud':
              winner = existing;
              break;
            case 'local':
              winner = localItem;
              break;
            case 'max':
              winner = (localItem.targetPrice || 0) > (existing.targetPrice || 0) 
                ? localItem : existing;
              break;
            default:
              winner = localItem;
          }
          
          merged.set(localItem.id, { 
            ...winner, 
            source: winner === localItem ? 'local' : 'cloud',
            conflictResolved: true 
          });
        } else if (localUpdated > cloudUpdated) {
          // Local is newer
          merged.set(localItem.id, { ...localItem, source: 'local' });
        }
        // else: cloud is newer, keep it
      }
    }
    
    return {
      items: Array.from(merged.values()),
      conflicts,
      strategy
    };
  }

  /**
   * Get or create product
   */
  async getOrCreateProduct(productData, client) {
    // Try to find existing
    let result;
    
    if (productData.amazonAsin) {
      result = await client.query(
        'SELECT * FROM products WHERE amazon_asin = $1',
        [productData.amazonAsin]
      );
    }
    
    if (!result?.rows.length && productData.aliexpressId) {
      result = await client.query(
        'SELECT * FROM products WHERE aliexpress_id = $1',
        [productData.aliexpressId]
      );
    }
    
    if (result?.rows.length) {
      return result.rows[0];
    }
    
    // Create new product
    const id = this.generateId();
    const newProduct = await client.query(
      `INSERT INTO products (id, amazon_asin, aliexpress_id, title, image_url, specs, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        id,
        productData.amazonAsin || null,
        productData.aliexpressId || null,
        productData.title,
        productData.image || null,
        JSON.stringify(productData.specs || {})
      ]
    );
    
    return newProduct.rows[0];
  }

  /**
   * Get cloud wishlist for user
   */
  async getCloudWishlist(userId) {
    const result = await this.db.query(
      `SELECT w.*, p.title as product_title, p.image_url as product_image
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1 AND w.deleted = false
       ORDER BY w.updated_at DESC`,
      [userId]
    );
    
    return result.rows;
  }

  /**
   * Save wishlist to cloud
   */
  async saveCloudWishlist(userId, items, client) {
    for (const item of items) {
      if (item.isNew) {
        // Insert new item
        await client.query(
          `INSERT INTO wishlist (id, user_id, product_id, target_price, alert_enabled, notes, tags, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             target_price = EXCLUDED.target_price,
             alert_enabled = EXCLUDED.alert_enabled,
             notes = EXCLUDED.notes,
             tags = EXCLUDED.tags,
             updated_at = EXCLUDED.updated_at`,
          [
            item.id,
            userId,
            item.productId,
            item.targetPrice,
            item.alertEnabled,
            item.notes,
            JSON.stringify(item.tags || []),
            item.createdAt || new Date(),
            item.updatedAt || new Date()
          ]
        );
      }
    }
  }

  /**
   * Record sync operation
   */
  async recordSync(userId, deviceId, data, client) {
    const id = this.generateId();
    
    await client.query(
      `INSERT INTO sync_history (id, user_id, device_id, direction, items_count, conflicts, version, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        id,
        userId,
        deviceId,
        data.direction,
        data.itemsCount || 1,
        JSON.stringify(data.conflicts || []),
        data.version,
        JSON.stringify(data)
      ]
    );
    
    return { id };
  }

  /**
   * Get last sync timestamp
   */
  async getLastSync(userId, deviceId) {
    const result = await this.db.query(
      `SELECT last_sync_at FROM user_devices 
       WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    );
    
    return result.rows[0]?.last_sync_at || null;
  }

  /**
   * Update device info
   */
  async updateDevice(userId, deviceId, data, client) {
    await client.query(
      `INSERT INTO user_devices (id, user_id, device_id, last_sync_at, sync_version, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, device_id) DO UPDATE SET
         last_sync_at = EXCLUDED.last_sync_at,
         sync_version = EXCLUDED.sync_version,
         updated_at = NOW()`,
      [
        this.generateId(),
        userId,
        deviceId,
        data.lastSync,
        data.syncVersion
      ]
    );
  }

  /**
   * Invalidate wishlist cache
   */
  async invalidateWishlistCache(userId) {
    await this.redis.del(`wishlist:${userId}`);
  }

  /**
   * Get sync history
   */
  async getSyncHistory(userId, options = {}) {
    const { limit = 50, deviceId = null } = options;
    
    let query = `
      SELECT sh.*, ud.device_name
      FROM sync_history sh
      LEFT JOIN user_devices ud ON sh.device_id = ud.device_id
      WHERE sh.user_id = $1
    `;
    const params = [userId];
    
    if (deviceId) {
      query += ' AND sh.device_id = $2';
      params.push(deviceId);
    }
    
    query += ' ORDER BY sh.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get connected devices
   */
  async getDevices(userId) {
    const result = await this.db.query(
      `SELECT device_id, device_name, device_type, last_sync_at, sync_version
       FROM user_devices
       WHERE user_id = $1
       ORDER BY last_sync_at DESC`,
      [userId]
    );
    
    return result.rows;
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(userId, conflictId, resolution, deviceId) {
    const { winner, mergedData } = resolution;
    
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update wishlist item
      await client.query(
        `UPDATE wishlist 
         SET target_price = $1,
             alert_enabled = $2,
             notes = $3,
             tags = $4,
             updated_at = NOW()
         WHERE id = $5 AND user_id = $6`,
        [
          mergedData.targetPrice,
          mergedData.alertEnabled,
          mergedData.notes,
          JSON.stringify(mergedData.tags || []),
          conflictId,
          userId
        ]
      );
      
      // Record resolution
      await this.recordSync(userId, deviceId, {
        direction: 'resolve',
        itemId: conflictId,
        resolution: winner,
        version: this.SYNC_VERSION
      }, client);
      
      await client.query('COMMIT');
      await this.invalidateWishlistCache(userId);
      
      return { success: true, resolved: true };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Export wishlist data
   */
  async exportWishlist(userId, format = 'json') {
    const wishlist = await this.getWishlist(userId, 'export');
    
    if (format === 'csv') {
      const headers = ['ID', 'Product', 'Target Price', 'Current Price', 'Alert Enabled', 'Added'];
      const rows = wishlist.items.map(item => [
        item.id,
        item.product.title,
        item.targetPrice,
        item.currentTotal,
        item.alertEnabled,
        item.createdAt
      ]);
      
      return {
        format: 'csv',
        data: [headers, ...rows].map(row => row.join(',')).join('\n')
      };
    }
    
    return {
      format: 'json',
      data: {
        version: this.SYNC_VERSION,
        exportedAt: new Date().toISOString(),
        items: wishlist.items
      }
    };
  }

  /**
   * Import wishlist data
   */
  async importWishlist(userId, data, deviceId) {
    const imported = [];
    const failed = [];
    
    for (const item of data.items || []) {
      try {
        const result = await this.addToWishlist(userId, {
          productId: item.productId,
          amazonAsin: item.product?.amazonAsin,
          title: item.product?.title,
          image: item.product?.image,
          targetPrice: item.targetPrice,
          alertEnabled: item.alertEnabled,
          notes: item.notes,
          tags: item.tags
        }, deviceId);
        
        imported.push(result.item);
      } catch (error) {
        failed.push({ item, error: error.message });
      }
    }
    
    return {
      success: true,
      imported: imported.length,
      failed: failed.length,
      items: imported,
      errors: failed
    };
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

module.exports = CloudSyncService;
