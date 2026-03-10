/**
 * AliSmart Finder - Background Service Worker
 * Monitors API health, manages notifications, and handles price alerts
 */

const CONFIG = {
  API_URL: 'https://ali-smart-finder.onrender.com',
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000
};

class BackgroundService {
  constructor() {
    this.apiStatus = 'checking';
    this.init();
  }

  async init() {
    console.log('[AliSmart] Background service initialized');
    
    // Setup alarm for periodic health checks
    chrome.alarms.create('healthCheck', { periodInMinutes: 0.5 });
    
    // Setup alarm for price monitoring
    chrome.alarms.create('priceMonitor', { periodInMinutes: 15 });
    
    // Listen for alarms
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'healthCheck') {
        this.checkApiHealth();
      } else if (alarm.name === 'priceMonitor') {
        this.checkPriceAlerts();
      }
    });

    // Listen for messages from popup/content
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async
    });

    // Initial health check
    await this.checkApiHealth();
  }

  async checkApiHealth() {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        this.apiStatus = 'online';
        this.updateBadge('active');
        console.log('[AliSmart] API is online:', data);
      } else {
        this.apiStatus = 'offline';
        this.updateBadge('offline');
        console.warn('[AliSmart] API returned error:', response.status);
      }
    } catch (error) {
      this.apiStatus = 'offline';
      this.updateBadge('offline');
      console.error('[AliSmart] API health check failed:', error.message);
    }

    // Store status for popup to access
    await chrome.storage.local.set({ apiStatus: this.apiStatus });
  }

  updateBadge(status) {
    const icons = {
      active: { text: 'ON', color: '#22c55e' },
      offline: { text: 'OFF', color: '#ef4444' },
      checking: { text: '...', color: '#f59e0b' }
    };

    const badge = icons[status] || icons.checking;
    
    chrome.action.setBadgeText({ text: badge.text });
    chrome.action.setBadgeBackgroundColor({ color: badge.color });
    chrome.action.setBadgeTextColor({ color: '#ffffff' });
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'getApiStatus':
        sendResponse({ 
          status: this.apiStatus, 
          url: CONFIG.API_URL 
        });
        break;

      case 'checkProduct':
        await this.checkProductPrice(request.product, sendResponse);
        break;

      case 'addToWishlist':
        await this.addToWishlist(request.product, sendResponse);
        break;

      case 'searchAliExpress':
        await this.searchAliExpress(request.query, sendResponse);
        break;

      case 'getPriceHistory':
        await this.getPriceHistory(request.productId, sendResponse);
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  }

  async checkProductPrice(product, sendResponse) {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}/api/search?query=${encodeURIComponent(product.title)}&amazonPrice=${product.price}&asin=${product.asin}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      sendResponse({ success: true, data: data.data });
    } catch (error) {
      console.error('[AliSmart] Price check failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async searchAliExpress(query, sendResponse) {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}/api/search?query=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      sendResponse({ success: true, data: data.data });
    } catch (error) {
      console.error('[AliSmart] Search failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async addToWishlist(product, sendResponse) {
    try {
      // Get auth token from storage
      const { authToken } = await chrome.storage.local.get('authToken');
      
      if (!authToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      const response = await fetch(`${CONFIG.API_URL}/api/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amazonAsin: product.asin,
          title: product.title,
          targetPrice: product.targetPrice
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'Added to Wishlist',
        message: `We'll alert you when the price drops for ${product.title.substring(0, 40)}...`
      });

      sendResponse({ success: true, data });
    } catch (error) {
      console.error('[AliSmart] Wishlist add failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async checkPriceAlerts() {
    try {
      const { authToken, wishlist } = await chrome.storage.local.get(['authToken', 'wishlist']);
      
      if (!authToken || !wishlist || wishlist.length === 0) return;

      // Check prices for wishlist items
      for (const item of wishlist) {
        try {
          const response = await fetch(
            `${CONFIG.API_URL}/api/search?query=${encodeURIComponent(item.title)}`,
            { 
              headers: { 'Authorization': `Bearer ${authToken}` },
              signal: AbortSignal.timeout(10000)
            }
          );

          if (response.ok) {
            const data = await response.json();
            
            // Check if price dropped below target
            if (data.success && data.data.totalCost <= item.targetPrice) {
              chrome.notifications.create(`price-drop-${item.id}`, {
                type: 'basic',
                iconUrl: 'icon-48.png',
                title: '💰 Price Drop Alert!',
                message: `${item.title.substring(0, 50)} is now $${data.data.totalCost} (target: $${item.targetPrice})`,
                buttons: [{ title: 'View Deal' }]
              });
            }
          }
        } catch (err) {
          console.warn(`[AliSmart] Failed to check ${item.title}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[AliSmart] Price alert check failed:', error);
    }
  }

  async getPriceHistory(productId, sendResponse) {
    try {
      const { authToken } = await chrome.storage.local.get('authToken');
      
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(
        `${CONFIG.API_URL}/api/price-history/${productId}?days=90`,
        { headers, signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      sendResponse({ success: true, data: data.data });
    } catch (error) {
      console.error('[AliSmart] Price history failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize the service
const service = new BackgroundService();

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('[AliSmart] Extension installed');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[AliSmart] Extension started');
});
