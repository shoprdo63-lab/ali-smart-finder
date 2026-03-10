/**
 * AliExpress Product Page Handler
 * Finds cheaper alternatives for the same product on AliExpress
 */

// Load UI component
const script = document.createElement('script');
script.src = chrome.runtime.getURL('ui/panel.js');
document.head.appendChild(script);

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// State management
let isProcessing = false;
let lastProcessedProductId = null;

/**
 * Check if current page is AliExpress product page
 */
function isProductPage() {
  return window.location.pathname.includes('/item/');
}

/**
 * Extract AliExpress product data
 */
function extractProductData() {
  try {
    // Extract product ID from URL
    const productIdMatch = window.location.pathname.match(/\/item\/(\d+)\.html/);
    const productId = productIdMatch ? productIdMatch[1] : null;

    if (!productId) {
      console.log('❌ No product ID found in URL');
      return null;
    }

    // Extract title - AliExpress uses various selectors
    const titleSelectors = [
      'h1[data-pl="product-title"]',
      '.product-title-text',
      'h1.product-title',
      '[class*="Title"]',
      'h1'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim() && el.textContent.trim().length > 10) {
        title = el.textContent.trim();
        break;
      }
    }

    if (!title) {
      console.log('❌ No product title found');
      return null;
    }

    // Extract price - multiple possible locations
    const priceSelectors = [
      '[class*="Price--current"]',
      '[class*="price--current"]',
      '.product-price-value',
      '[data-pl="product-price"]',
      '.price-current'
    ];

    let priceText = null;
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        priceText = el.textContent.trim();
        break;
      }
    }

    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;

    // Extract shipping cost (if visible)
    const shippingSelectors = [
      '[class*="Shipping"]',
      '[class*="shipping"]',
      '[data-pl="shipping"]'
    ];

    let shippingText = null;
    for (const selector of shippingSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.includes('$')) {
        shippingText = el.textContent.trim();
        break;
      }
    }

    const shippingCost = shippingText ? parseFloat(shippingText.replace(/[^0-9.]/g, '')) : 0;

    console.log('📦 AliExpress Product Extracted:');
    console.log(`   Product ID: ${productId}`);
    console.log(`   Title: ${title.substring(0, 60)}...`);
    console.log(`   Price: $${price || 'N/A'}`);
    console.log(`   Shipping: $${shippingCost}`);

    return {
      productId,
      title,
      price,
      shippingCost,
      url: window.location.href
    };

  } catch (error) {
    console.error('❌ Error extracting product data:', error);
    return null;
  }
}

/**
 * Process product and find cheaper alternatives
 */
async function processProduct() {
  if (isProcessing) {
    console.log('⏳ Already processing...');
    return;
  }

  const productData = extractProductData();
  if (!productData) {
    console.log('❌ Could not extract product data');
    return;
  }

  // Check if already processed
  if (lastProcessedProductId === productData.productId) {
    console.log('✓ Already processed this product');
    return;
  }

  isProcessing = true;
  lastProcessedProductId = productData.productId;

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 WC PRICE HUNTER - ALIEXPRESS MODE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Call backend API
    const result = await api.findCheaperAlternatives(productData);

    if (!result.success) {
      console.error('❌ API error:', result.error);
      isProcessing = false;
      return;
    }

    // Show UI based on result
    if (result.hasCheaper && result.cheapest) {
      console.log(`✅ Found cheaper alternative! Savings: $${result.savings.toFixed(2)} (${result.savingsPercent}%)`);
      smartPanel.create(result, 'aliexpress');
    } else {
      console.log('✅ This is already the best price!');
      // Show "best price" badge
      smartPanel.create(result, 'aliexpress');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Processing error:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Initialize on page load
 */
function initialize() {
  if (!isProductPage()) {
    console.log('ℹ️  Not an AliExpress product page');
    return;
  }

  console.log('✓ WC Price Hunter initialized on AliExpress product page');

  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(processProduct, 2000); // AliExpress loads slower
    });
  } else {
    setTimeout(processProduct, 2000);
  }

  // Watch for dynamic content changes
  const debouncedProcess = debounce(processProduct, 3000);
  
  const observer = new MutationObserver((mutations) => {
    // Check if URL changed
    const currentProductId = window.location.pathname.match(/\/item\/(\d+)\.html/)?.[1];
    if (currentProductId && currentProductId !== lastProcessedProductId) {
      console.log('🔄 Product changed, reprocessing...');
      smartPanel.remove();
      debouncedProcess();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start
initialize();
