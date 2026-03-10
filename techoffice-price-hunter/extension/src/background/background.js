/**
 * TechOffice Price Hunter - Background Script
 * Service worker for extension management
 */

// Configuration
const CONFIG = {
  backendUrl: 'http://localhost:3000',
  affiliateKey: 'ali_smart_finder_v1'
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('💎 TechOffice Price Hunter: Installed');
  
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    autoShow: true,
    subscription: {
      active: true,
      tier: 'pro',
      expiresAt: null
    },
    stats: {
      todayScans: 0,
      opportunities: 0,
      totalProfit: 0
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'fetchArbitrage':
      fetchArbitrageData(request.data)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async

    case 'updateStats':
      updateStats(request.data);
      sendResponse({ success: true });
      return true;

    case 'checkSubscription':
      checkSubscription()
        .then(status => sendResponse({ success: true, status }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'downloadImages':
      downloadImages(request.data);
      sendResponse({ success: true });
      return true;
  }
});

// Fetch arbitrage data from backend
async function fetchArbitrageData(productData) {
  const { asin, title } = productData;
  
  const response = await fetch(
    `${CONFIG.backendUrl}/api/match-amazon?asin=${asin}&title=${encodeURIComponent(title)}`
  );
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}

// Update daily stats
async function updateStats(data) {
  const result = await chrome.storage.sync.get(['stats']);
  const stats = result.stats || { todayScans: 0, opportunities: 0, totalProfit: 0 };
  
  if (data.scanned) {
    stats.todayScans = (stats.todayScans || 0) + 1;
  }
  
  if (data.opportunity) {
    stats.opportunities = (stats.opportunities || 0) + 1;
    if (data.profit) {
      stats.totalProfit = (stats.totalProfit || 0) + data.profit;
    }
  }
  
  await chrome.storage.sync.set({ stats });
}

// Check subscription status
async function checkSubscription() {
  const result = await chrome.storage.sync.get(['subscription']);
  const subscription = result.subscription || { active: false, tier: 'free' };
  
  // Check if expired
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    subscription.active = false;
    await chrome.storage.sync.set({ subscription });
  }
  
  return subscription;
}

// Download product images
function downloadImages(images) {
  images.forEach((img, index) => {
    chrome.downloads.download({
      url: img.url,
      filename: `techoffice-images/product-image-${index + 1}.jpg`,
      saveAs: false
    });
  });
}

// Reset stats daily
chrome.alarms.create('resetStats', { periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetStats') {
    chrome.storage.sync.set({
      stats: { todayScans: 0, opportunities: 0, totalProfit: 0 }
    });
  }
});

console.log('🔥 TechOffice Price Hunter: Background script loaded');
