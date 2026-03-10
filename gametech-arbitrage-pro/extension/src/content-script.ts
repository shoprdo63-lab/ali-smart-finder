/**
 * GameTech Arbitrage Pro - Content Script
 * Injects premium glass-morphism panel into Amazon product pages
 * [cite: 2026-01-25, 2026-02-09] - Premium UI and niche filtering
 */

import { NicheValidator } from './services/niche-validator.js';
import { ProductExtractor } from './services/product-extractor.js';
import { PanelRenderer } from './panel/panel-renderer.js';
import { ImageDownloader } from './services/image-downloader.js';

console.log('%c[GameTech Arbitrage] Content script loaded', 'color: #00BFFF; font-weight: bold;');

// Configuration
const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  PANEL_ID: 'gametech-arbitrage-panel',
  MAX_RETRIES: 15,
  RETRY_DELAY: 800,
  DEBOUNCE_DELAY: 1000,
};

// State
let currentASIN: string | null = null;
let isProcessing = false;
let panelRenderer: PanelRenderer;
let nicheValidator: NicheValidator;
let productExtractor: ProductExtractor;
let imageDownloader: ImageDownloader;

// Initialize
function init(): void {
  console.log('[GameTech Arbitrage] Initializing...');
  
  nicheValidator = new NicheValidator();
  productExtractor = new ProductExtractor();
  panelRenderer = new PanelRenderer(CONFIG.PANEL_ID);
  imageDownloader = new ImageDownloader();
  
  // Check if on Amazon product page
  if (!isAmazonProductPage()) {
    console.log('[GameTech Arbitrage] Not an Amazon product page');
    return;
  }
  
  // Start detection
  attemptProductDetection();
  
  // Setup observers for dynamic content
  setupMutationObserver();
  setupURLChangeListener();
}

/**
 * Check if current page is an Amazon product page
 */
function isAmazonProductPage(): boolean {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  const isAmazon = hostname.includes('amazon.');
  const isProductPage = pathname.includes('/dp/') || pathname.includes('/gp/product/');
  
  return isAmazon && isProductPage;
}

/**
 * Attempt to detect and process product
 */
async function attemptProductDetection(attempt = 0): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    // Extract product data
    const productData = productExtractor.extract();
    
    if (!productData || !productData.asin) {
      if (attempt < CONFIG.MAX_RETRIES) {
        setTimeout(() => {
          isProcessing = false;
          attemptProductDetection(attempt + 1);
        }, CONFIG.RETRY_DELAY);
        return;
      }
      console.log('[GameTech Arbitrage] Max retries reached');
      isProcessing = false;
      return;
    }
    
    // Check if same product
    if (currentASIN === productData.asin) {
      isProcessing = false;
      return;
    }
    
    currentASIN = productData.asin;
    console.log('[GameTech Arbitrage] Product detected:', productData.title);
    
    // Validate niche (tech only, block fashion)
    const nicheCheck = nicheValidator.validate(productData.title, productData.category);
    
    if (!nicheCheck.allowed) {
      console.log('[GameTech Arbitrage] Product rejected:', nicheCheck.reason);
      // Don't show panel - silently reject
      isProcessing = false;
      return;
    }
    
    console.log('[GameTech Arbitrage] Category detected:', nicheCheck.category);
    
    // Show loading panel
    panelRenderer.showLoading(nicheCheck.category);
    
    // Fetch arbitrage data from backend
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/api/v1/find`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asin: productData.asin,
          title: productData.title,
          category: nicheCheck.category,
          price: productData.price,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'No match found');
      }
      
      // Render results panel
      panelRenderer.showResults({
        asin: productData.asin,
        amazonProduct: productData,
        aliExpress: result.data.aliExpress,
        profit: result.data.profit,
        niche: result.data.niche,
        onDownloadImages: () => handleDownloadImages(productData),
        onClose: () => panelRenderer.hide(),
      });
      
    } catch (apiError) {
      console.error('[GameTech Arbitrage] API error:', apiError);
      panelRenderer.showError('Unable to fetch AliExpress data. Please try again later.');
    }
    
  } catch (error) {
    console.error('[GameTech Arbitrage] Detection error:', error);
  }
  
  isProcessing = false;
}

/**
 * Handle image download request
 */
async function handleDownloadImages(productData: any): Promise<void> {
  try {
    panelRenderer.showImageDownloadProgress(0);
    
    // Send message to background script for image download
    chrome.runtime.sendMessage({
      action: 'downloadImages',
      asin: productData.asin,
      imageUrls: productData.images,
    }, (response) => {
      if (response?.success) {
        panelRenderer.showImageDownloadProgress(100);
        setTimeout(() => panelRenderer.hideImageDownloadProgress(), 2000);
      } else {
        panelRenderer.showImageDownloadError(response?.error || 'Download failed');
      }
    });
  } catch (error) {
    console.error('[GameTech Arbitrage] Image download error:', error);
    panelRenderer.showImageDownloadError('Failed to download images');
  }
}

/**
 * Setup mutation observer for dynamic content
 */
function setupMutationObserver(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check for relevant elements
          if (
            node.matches?.('#productTitle, #ppd, #centerCol, #apex_desktop') ||
            node.querySelector?.('#productTitle, #ppd, #centerCol')
          ) {
            shouldCheck = true;
          }
        }
      });
    });
    
    if (shouldCheck && !isProcessing) {
      setTimeout(() => attemptProductDetection(), CONFIG.DEBOUNCE_DELAY);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Setup URL change listener for SPA navigation
 */
function setupURLChangeListener(): void {
  let lastUrl = window.location.href;
  
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      currentASIN = null;
      panelRenderer.hide();
      
      if (isAmazonProductPage()) {
        setTimeout(() => attemptProductDetection(), 1000);
      }
    }
  }).observe(document, { subtree: true, childList: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
