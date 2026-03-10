/**
 * GameTech Arbitrage Pro - Background Service Worker
 * Manifest V3 service worker for privileged operations
 * [cite: 2026-02-26] - Background service worker requirements
 */

import { logger } from './utils/logger.js';

console.log('[GameTech Arbitrage BG] Service worker started');

// Configuration
const BACKEND_URL = 'http://localhost:3000';

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[GameTech Arbitrage BG] Extension installed:', details.reason);
  
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    autoShow: true,
    panelPosition: 'right',
    theme: 'dark',
    lastVersion: chrome.runtime.getManifest().version,
  });
});

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[GameTech Arbitrage BG] Message received:', request.action);
  
  switch (request.action) {
    case 'downloadImages':
      handleImageDownload(request, sendResponse);
      return true; // Keep channel open for async
      
    case 'proxyImage':
      handleProxyImage(request, sendResponse);
      return true;
      
    case 'fetchBackend':
      handleBackendFetch(request, sendResponse);
      return true;
      
    case 'getSettings':
      handleGetSettings(sendResponse);
      return true;
      
    case 'setSettings':
      handleSetSettings(request.data, sendResponse);
      return true;
  }
  
  return false;
});

/**
 * Handle image download request
 * [cite: 2026-02-26, 2026-01-23] - Image download feature
 */
async function handleImageDownload(
  request: { asin: string; imageUrls: string[] },
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const { asin, imageUrls } = request;
    
    console.log('[GameTech Arbitrage BG] Downloading images for', asin);
    
    // Send to backend for proxy/download
    const response = await fetch(`${BACKEND_URL}/api/v1/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asin, imageUrls }),
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }
    
    // Download each image
    const downloadedFiles: string[] = [];
    
    for (let i = 0; i < result.data.images.length; i++) {
      const img = result.data.images[i];
      
      if (img.data) {
        // Convert base64 to blob and download
        const blob = await fetch(img.data).then(r => r.blob());
        const url = URL.createObjectURL(blob);
        
        await chrome.downloads.download({
          url: url,
          filename: `gametech-${asin}-image-${i + 1}.jpg`,
          saveAs: false,
        });
        
        downloadedFiles.push(`image-${i + 1}.jpg`);
        URL.revokeObjectURL(url);
      }
    }
    
    sendResponse({
      success: true,
      downloaded: downloadedFiles.length,
      files: downloadedFiles,
    });
    
  } catch (error) {
    console.error('[GameTech Arbitrage BG] Image download error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Handle proxy image request
 */
async function handleProxyImage(
  request: { url: string },
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const response = await fetch(request.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const blob = await response.blob();
    const reader = new FileReader();
    
    reader.onloadend = () => {
      sendResponse({
        success: true,
        dataUrl: reader.result,
      });
    };
    
    reader.readAsDataURL(blob);
    
  } catch (error) {
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Handle backend API fetch
 */
async function handleBackendFetch(
  request: { endpoint: string; method: string; body?: any },
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}${request.endpoint}`, {
      method: request.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
    
    const data = await response.json();
    
    sendResponse({
      success: response.ok,
      data,
      status: response.status,
    });
    
  } catch (error) {
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Handle get settings
 */
function handleGetSettings(sendResponse: (response: any) => void): void {
  chrome.storage.sync.get([
    'enabled',
    'autoShow',
    'panelPosition',
    'theme',
  ], (result) => {
    sendResponse({
      success: true,
      settings: result,
    });
  });
}

/**
 * Handle set settings
 */
function handleSetSettings(
  data: Record<string, any>,
  sendResponse: (response: any) => void
): void {
  chrome.storage.sync.set(data, () => {
    sendResponse({
      success: true,
    });
  });
}

/**
 * Handle alarms for periodic tasks
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'clearCache') {
    console.log('[GameTech Arbitrage BG] Clearing cache');
    // Clear extension cache if needed
  }
});

// Create periodic alarm
chrome.alarms.create('clearCache', { periodInMinutes: 60 });

/**
 * Handle context menu clicks (if context menus added)
 */
chrome.contextMenus?.onClicked?.addListener((info, tab) => {
  console.log('[GameTech Arbitrage BG] Context menu clicked:', info.menuItemId);
});

// Log startup
console.log('[GameTech Arbitrage BG] Service worker initialized');
