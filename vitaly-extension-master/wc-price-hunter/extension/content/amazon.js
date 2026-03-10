/**
 * Amazon Product Page Handler
 * Detects Amazon products and finds cheaper alternatives on AliExpress
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
let lastProcessedASIN = null;

/**
 * Check if current page is Amazon product page
 */
function isProductPage() {
  return window.location.pathname.includes('/dp/');
}

/**
 * Extract Amazon product data
 */
function extractProductData() {
  try {
    // Extract ASIN from URL
    const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : null;

    if (!asin) {
      console.log('❌ No ASIN found in URL');
      return null;
    }

    // Extract title
    const titleSelectors = [
      '#productTitle',
      '[data-automation-id="title"]',
      '.product-title',
      'h1.a-size-large',
      'h1#title'
    ];

    let title = null;
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        title = el.textContent.trim();
        break;
      }
    }

    if (!title) {
      console.log('❌ No product title found');
      return null;
    }

    // Extract price
    const priceSelectors = [
      '.a-price .a-offscreen',
      '.a-price-whole',
      '[data-automation-id="price"]',
      '.priceToPay .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price[data-a-color="price"] .a-offscreen'
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

    // Extract brand (optional)
    const brandEl = document.querySelector('#bylineInfo, .po-brand .po-break-word');
    const brand = brandEl?.textContent?.trim().replace(/^(Brand:|Visit the|by)\s*/i, '') || null;

    console.log('📦 Amazon Product Extracted:');
    console.log(`   ASIN: ${asin}`);
    console.log(`   Title: ${title.substring(0, 60)}...`);
    console.log(`   Price: $${price || 'N/A'}`);
    console.log(`   Brand: ${brand || 'N/A'}`);

    return {
      asin,
      title,
      price,
      brand,
      url: window.location.href
    };

  } catch (error) {
    console.error('❌ Error extracting product data:', error);
    return null;
  }
}

/**
 * Process product and find matches
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
  if (lastProcessedASIN === productData.asin) {
    console.log('✓ Already processed this product');
    return;
  }

  isProcessing = true;
  lastProcessedASIN = productData.asin;

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 WC PRICE HUNTER - AMAZON MODE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Call backend API
    const result = await api.matchAmazonProduct(productData);

    if (!result.success) {
      console.error('❌ API error:', result.error);
      isProcessing = false;
      return;
    }

    // Show UI based on result
    if (result.matched && result.bestDeal) {
      console.log('✅ Match found! Showing comparison panel...');
      smartPanel.create(result, 'amazon');
    } else {
      console.log('ℹ️  No better deal found on AliExpress');
      // Optionally show "best price" badge
      // smartPanel.create(result, 'amazon');
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
    console.log('ℹ️  Not an Amazon product page');
    return;
  }

  console.log('✓ WC Price Hunter initialized on Amazon product page');

  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(processProduct, 1000);
    });
  } else {
    setTimeout(processProduct, 1000);
  }

  // Watch for dynamic content changes (SPA navigation)
  const debouncedProcess = debounce(processProduct, 2000);
  
  const observer = new MutationObserver((mutations) => {
    // Check if URL changed (SPA navigation)
    const currentASIN = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1];
    if (currentASIN && currentASIN !== lastProcessedASIN) {
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
