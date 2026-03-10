import express from 'express';
import CloudSyncService from '../services/cloudSyncService.js';
import AuthService from '../services/authService.js';

const router = express.Router();
const cloudSyncService = new CloudSyncService();
const authService = new AuthService();

// Auth middleware
const authMiddleware = authService.middleware();

/**
 * GET /api/wishlist
 * Get user's wishlist
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;
    
    const wishlist = await cloudSyncService.getWishlist(
      req.user.userId,
      deviceId || 'api'
    );
    
    res.json({
      success: true,
      data: wishlist
    });
    
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/wishlist
 * Add item to wishlist
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, amazonAsin, title, image, targetPrice, alertEnabled, notes, tags } = req.body;
    const { deviceId } = req.query;
    
    if (!productId && !amazonAsin) {
      return res.status(400).json({
        success: false,
        error: { message: 'Product ID or Amazon ASIN is required' }
      });
    }
    
    const result = await cloudSyncService.addToWishlist(
      req.user.userId,
      {
        productId,
        amazonAsin,
        title,
        image,
        targetPrice,
        alertEnabled,
        notes,
        tags
      },
      deviceId || 'api'
    );
    
    res.status(201).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * DELETE /api/wishlist/:id
 * Remove item from wishlist
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.query;
    
    const result = await cloudSyncService.removeFromWishlist(
      req.user.userId,
      id,
      deviceId || 'api'
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/wishlist/sync
 * Sync wishlist with cloud
 */
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { items, deviceId, lastSync } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Device ID is required for sync' }
      });
    }
    
    const result = await cloudSyncService.syncWishlist(
      req.user.userId,
      deviceId,
      items || [],
      { lastSync }
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * GET /api/wishlist/sync-history
 * Get sync history
 */
router.get('/sync-history', authMiddleware, async (req, res) => {
  try {
    const { limit, deviceId } = req.query;
    
    const history = await cloudSyncService.getSyncHistory(
      req.user.userId,
      {
        limit: limit ? parseInt(limit) : 50,
        deviceId
      }
    );
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('Sync history error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * GET /api/wishlist/devices
 * Get connected devices
 */
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const devices = await cloudSyncService.getDevices(req.user.userId);
    
    res.json({
      success: true,
      data: devices
    });
    
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/wishlist/resolve-conflict
 * Resolve sync conflict manually
 */
router.post('/resolve-conflict', authMiddleware, async (req, res) => {
  try {
    const { conflictId, resolution, deviceId } = req.body;
    
    if (!conflictId || !resolution) {
      return res.status(400).json({
        success: false,
        error: { message: 'Conflict ID and resolution are required' }
      });
    }
    
    const result = await cloudSyncService.resolveConflict(
      req.user.userId,
      conflictId,
      resolution,
      deviceId || 'api'
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * GET /api/wishlist/export
 * Export wishlist
 */
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const exportData = await cloudSyncService.exportWishlist(
      req.user.userId,
      format
    );
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=wishlist.csv');
      res.send(exportData.data);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/wishlist/import
 * Import wishlist
 */
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    const { deviceId } = req.query;
    
    if (!data || !data.items) {
      return res.status(400).json({
        success: false,
        error: { message: 'Import data is required' }
      });
    }
    
    const result = await cloudSyncService.importWishlist(
      req.user.userId,
      data,
      deviceId || 'api'
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

export default router;
