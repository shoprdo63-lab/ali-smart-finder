// WC Price Hunter - Professional Content Script
// Advanced Amazon price comparison with AliExpress
// Version: 2.0.0

console.error('!!! ALISMART LOADED AT START !!!');

(function() {
  'use strict';

  // IMMEDIATE DEBUG - This should show in console immediately
  console.log('%c[WC Price Hunter] Script loaded!', 'color: #667eea; font-size: 14px; font-weight: bold;');
  console.log('[WC Price Hunter] URL:', window.location.href);
  console.log('[WC Price Hunter] Hostname:', window.location.hostname);
  console.log('[WC Price Hunter] Pathname:', window.location.pathname);

  // NUCLEAR OPTION: Force inject immediately even before body exists
  if (window.location.hostname.includes('amazon.')) {
    console.error('[NUCLEAR] Amazon detected - forcing immediate injection');
    
    // Inject directly into document.documentElement
    document.documentElement.innerHTML += '<div id="alismart-nuclear" style="position:fixed; top:0; right:0; width:300px; height:100vh; border:20px solid red; z-index:2147483647; background:white; color:black;"><h1>LOADED</h1></div>';
    
    // Also use MutationObserver to catch when body becomes available
    const observer = new MutationObserver((mutations) => {
      if (document.body && !document.querySelector('#wc-price-hunter-card')) {
        console.error('[NUCLEAR] Body detected - injecting sidebar');
        injectSidebarInstantly();
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // STRICT TECH ONLY - Only Gaming & Tech keywords (NO kitchen appliances)
  const TECH_GAMING_KEYWORDS = [
    'gaming', 'game', 'controller', 'joystick', 'console', 'playstation', 'xbox', 'nintendo', 'switch',
    'headset', 'headphones gaming', 'mouse gaming', 'keyboard gaming', 'mouse pad', 'gaming chair',
    'gaming desk', 'streaming', 'webcam', 'capture card', 'vr', 'virtual reality', 'oculus',
    'laptop', 'computer', 'pc', 'monitor', 'display', 'keyboard', 'mouse', 'webcam', 'microphone',
    'router', 'wifi', 'ethernet', 'cable', 'adapter', 'charger', 'power bank', 'battery',
    'ssd', 'hard drive', 'storage', 'ram', 'memory', 'cpu', 'processor', 'gpu', 'graphics card',
    'motherboard', 'psu', 'power supply', 'case', 'cooling', 'fan', 'rgb', 'led',
    'phone', 'smartphone', 'tablet', 'ipad', 'android', 'iphone', 'case phone', 'screen protector',
    'camera', 'dslr', 'mirrorless', 'lens', 'tripod', 'gimbal', 'drone', 'dji',
    'smart watch', 'fitness tracker', 'earbuds', 'airpods', 'headphones', 'speaker', 'bluetooth',
    'smart home', 'alexa', 'google home', 'smart speaker', 'thermostat', 'security camera',
    'usb', 'hdmi', 'displayport', 'usb-c', 'thunderbolt', 'wireless', 'bluetooth'
  ];

  // STRICT BLOCK - Kitchen appliances and non-tech (100% blocked)
  const BLOCKED_KEYWORDS = [
    'rice cooker', 'slow cooker', 'pressure cooker', 'air fryer', 'kitchen', 'cooking', 'food', 'recipe', 
    'pot', 'pan', 'knife', 'utensil', 'appliance', 'toaster', 'blender', 'mixer', 'oven', 'stove', 
    'refrigerator', 'fridge', 'dishwasher', 'microwave', 'kettle', 'coffee maker', 'espresso',
    'furniture', 'chair office', 'table', 'desk', 'shelf', 'storage', 'organizer',
    'clothing', 'shirt', 'pants', 'dress', 'shoes', 'bag', 'purse', 'jewelry',
    'beauty', 'makeup', 'skincare', 'cream', 'lotion', 'perfume', 'cosmetic',
    'toy', 'doll', 'stuffed animal', 'lego', 'puzzle', 'board game', 'children',
    'book', 'novel', 'magazine', 'textbook', 'ebook', 'audiobook',
    'grocery', 'food', 'snack', 'beverage', 'drink', 'coffee', 'tea',
    'home decor', 'pillow', 'blanket', 'curtain', 'rug', 'carpet', 'mirror',
    'cleaning', 'vacuum', 'mop', 'broom', 'detergent', 'soap', 'shampoo',
    'pet', 'dog', 'cat', 'fish', 'aquarium', 'pet food', 'pet toy'
  ];

  const CONFIG = {
    BACKEND_URL: 'https://ali-smart-finder.onrender.com',
    CARD_ID: 'wc-price-hunter-card',
    DEBUG: true,
    RETRY_ATTEMPTS: 15,
    RETRY_DELAY: 600,
    DEBOUNCE_DELAY: 1000,
    CACHE_DURATION: 5 * 60 * 1000,
    TRUNCATE_WORDS: 3  // Truncate to 3 words ONLY for maximum search hits
  };

  const CACHE = new Map();
  let observer = null;
  let debounceTimer = null;
  let currentProduct = null;
  let isProcessing = false;
  let urlObserver = null;
  let sidebarContainer = null;
  let currentState = 'hidden'; // hidden, loading, success, empty

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Message handler - popup requests product info
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getProductInfo') {
      try {
        const product = extractProductData();
        if (product && product.title) {
          // NUCLEAR: Hard-code truncation to exactly 5 words
          const query = product.title.split(' ').slice(0, 5).join(' ').replace(/[+–!()\[\]]/g, '');
          product.title = query;
          
          console.log(`[AliSmart Finder] Cleaned Search Query: ${query}`);
          
          sendResponse({ product });
        } else {
          sendResponse({ product: null, error: 'No product found on this page' });
        }
      } catch (e) {
        sendResponse({ product: null, error: e.message });
      }
      return true;
    }
  });

  function log(...args) {
    if (CONFIG.DEBUG) {
      console.log('[WC Price Hunter]', ...args);
    }
  }

  function init() {
    log('Initializing WC Price Hunter v2.0 - ROBUST MODE...');
    
    // BYPASS CHECK: Always inject sidebar on any Amazon domain
    if (!window.location.hostname.includes('amazon.')) {
      log('Not an Amazon domain, skipping');
      return;
    }

    log('Amazon page detected:', window.location.href);
    
    // EMERGENCY: Inject sidebar IMMEDIATELY - FIRST THING
    if (document.body) {
      injectSidebarInstantly();
    } else {
      // If body not ready, wait a bit
      setTimeout(() => {
        if (document.body) {
          injectSidebarInstantly();
        }
      }, 100);
    }
    
    // Initial detection attempt
    attemptProductDetection();
    
    // Setup observers
    setupMutationObserver();
    setupURLChangeListener();
  }

  function isGamingTechProduct(title) {
    const lowerTitle = title.toLowerCase();
    
    // First check if it's blocked
    for (const blocked of BLOCKED_KEYWORDS) {
      if (lowerTitle.includes(blocked.toLowerCase())) {
        console.log(`[WC Price Hunter] BLOCKED: "${blocked}" found in title`);
        return false;
      }
    }
    
    // Then check if it's gaming/tech
    for (const keyword of TECH_GAMING_KEYWORDS) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        console.log(`[WC Price Hunter] APPROVED: "${keyword}" found in title`);
        return true;
      }
    }
    
    console.log(`[WC Price Hunter] REJECTED: No gaming/tech keywords found`);
    return false;
  }

  // Calculate similarity between two strings (Levenshtein-based)
  function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (s1 === s2) return 100;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    const costs = [];
    for (let i = 0; i <= shorter.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= longer.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (shorter[i - 1] !== longer[j - 1]) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[longer.length] = lastValue;
    }
    
    const distance = costs[longer.length];
    return Math.round((1 - distance / longer.length) * 100);
  }

  function isAmazonPage() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    const isAmazonDomain = hostname.includes('amazon.');
    const isProductPage = pathname.includes('/dp/') || 
                          pathname.includes('/gp/product/') ||
                          pathname.includes('/gp/aw/d/') ||
                          pathname.includes('/product/');
    
    console.log('[WC Price Hunter] isAmazonDomain:', isAmazonDomain);
    console.log('[WC Price Hunter] isProductPage:', isProductPage);
    
    // More permissive - check if we're on any Amazon domain
    if (!isAmazonDomain) {
      console.log('[WC Price Hunter] Not an Amazon domain, skipping');
      return false;
    }
    
    // Log if we're not on a product page but still on Amazon
    if (!isProductPage) {
      console.log('[WC Price Hunter] On Amazon but not a product page - injecting anyway');
    }
    
    return isAmazonDomain; // Run on all Amazon pages, filter products later
  }

  function setupMutationObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      let relevantChange = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (isRelevantElement(node)) {
              relevantChange = true;
            }
          }
        });
      });

      if (relevantChange && !isProcessing) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          attemptProductDetection();
        }, CONFIG.DEBOUNCE_DELAY);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    log('MutationObserver active - watching for product changes');
  }

  function isRelevantElement(node) {
    const selectors = [
      '#productTitle',
      '#title',
      '#ppd',
      '#centerCol',
      '[data-automation-id="title"]',
      '.a-price',
      '#apex_desktop',
      '#corePrice_feature_div',
      '#titleSection',
      '.product-title'
    ];
    
    for (const selector of selectors) {
      if (node.matches?.(selector) || node.querySelector?.(selector)) {
        return true;
      }
    }
    return false;
  }

  function setupURLChangeListener() {
    let lastUrl = window.location.href;
    
    if (urlObserver) {
      urlObserver.disconnect();
    }
    
    urlObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        log('URL changed, reinitializing...');
        
        removeCard();
        currentProduct = null;
        isProcessing = false;
        
        setTimeout(() => {
          if (isAmazonPage()) {
            attemptProductDetection();
          }
        }, 800);
      }
    });
    
    urlObserver.observe(document, { subtree: true, childList: true });
  }

  async function attemptProductDetection(attempt = 0) {
    if (isProcessing) {
      log('Already processing, skipping');
      return;
    }
    
    isProcessing = true;
    log(`Detection attempt ${attempt + 1}/${CONFIG.RETRY_ATTEMPTS}`);
    
    try {
      const product = extractProductData();
      
      if (!product || !product.title) {
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          log('Product data not ready, retrying...');
          isProcessing = false;
          setTimeout(() => attemptProductDetection(attempt + 1), CONFIG.RETRY_DELAY);
          return;
        }
        log('Max retries reached, product data unavailable');
        isProcessing = false;
        return;
      }

      // Check if same product - DISABLED FOR TESTING
      // if (currentProduct && 
      //     (currentProduct.asin === product.asin || 
      //      currentProduct.title === product.title)) {
      //   log('Same product already processed');
      //   isProcessing = false;
      //   return;
      // }

      currentProduct = product;
      log('Product detected:', product.title.substring(0, 50) + '...', 'Price:', product.price);
      
      // NICHE ENFORCEMENT: Only process Gaming & Tech products
      if (!isGamingTechProduct(product.title)) {
        log('Product rejected - not Gaming/Tech niche');
        updateSidebarState('empty', { 
          query: product.title,
          message: 'This extension only works for Gaming & Tech products'
        });
        isProcessing = false;
        return;
      }
      
      // Check cache
      const cacheKey = product.asin || product.title;
      if (CACHE.has(cacheKey)) {
        const cached = CACHE.get(cacheKey);
        if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
          log('Using cached AliExpress data');
          if (cached.data) {
            showPriceCard(cached.data);
          }
          isProcessing = false;
          return;
        }
      }

      // Update to loading state
      updateSidebarState('loading');
      
      const aliData = await searchAliExpress(product.title);
      
      // Check if no accurate match found (similarity < 80%)
      if (aliData?.noMatch) {
        log('❌ No accurate match found - showing empty state');
        updateSidebarState('empty', { query: aliData.query || product.title });
        CACHE.set(cacheKey, { data: null, timestamp: Date.now() });
        isProcessing = false;
        return;
      }
      
      if (!aliData) {
        log('❌ No AliExpress results - showing empty state');
        updateSidebarState('empty', { query: product.title });
        CACHE.set(cacheKey, { data: null, timestamp: Date.now() });
        isProcessing = false;
        return;
      }
      
      // Validate that we have a valid URL
      const hasValidUrl = aliData.affiliateUrl || aliData.url || aliData.aliUrl;
      if (!hasValidUrl) {
        log('ERROR: AliExpress result has no valid URL:', aliData);
        updateSidebarState('empty', { query: product.title });
        CACHE.set(cacheKey, { data: null, timestamp: Date.now() });
        isProcessing = false;
        return;
      }
      
      log('✅ Valid AliExpress URL found:', hasValidUrl);

      const amazonPrice = parsePrice(product.price);
      const aliPrice = aliData.aliPrice || 0;
      
      const savings = amazonPrice - aliPrice;
      const savingsPercent = amazonPrice > 0 ? Math.round((savings / amazonPrice) * 100) : 0;
      
      const result = {
        amazonPrice,
        aliPrice,
        savings: Math.max(0, savings),
        savingsPercent: Math.max(0, savingsPercent),
        aliProduct: aliData,
        amazonProduct: product,
        isCheaper: aliPrice < amazonPrice
      };

      CACHE.set(cacheKey, { data: result, timestamp: Date.now() });
      updateSidebarState('success', result);
      
    } catch (error) {
      log('Error in detection:', error);
      updateSidebarState('empty', { query: currentProduct?.title || 'Unknown product' });
    }
    
    isProcessing = false;
  }

  function extractProductData() {
    try {
      // Title extraction with multiple fallbacks
      const titleSelectors = [
        '#productTitle',
        '[data-automation-id="title"]',
        'h1.a-size-large:not(.a-text-ellipsis)',
        '#title',
        'h1.a-size-extra-large',
        '.product-title-word-break'
      ];
      
      let title = null;
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          title = cleanTitle(el.textContent.trim());
          if (title.length > 5) break;
        }
      }
      
      if (!title || title.length < 3) {
        log('Could not extract valid product title');
        return null;
      }

      // Price extraction - comprehensive
      let price = '';
      
      // Try specific selectors first
      const priceSelectors = [
        '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
        '.a-price .a-offscreen',
        '.a-price-whole',
        '.a-price.a-text-price .a-offscreen',
        '[data-automation-id="price"]',
        '.a-price-to-pay .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price-buy-box .a-offscreen',
        '.priceToPay .a-offscreen',
        '.a-price-current .a-offscreen'
      ];
      
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          price = el.textContent.trim();
          if (price.includes('$')) break;
        }
      }
      
      // Fallback: scan all price elements
      if (!price.includes('$')) {
        const allPrices = document.querySelectorAll('.a-price .a-offscreen');
        for (const el of allPrices) {
          const text = el.textContent.trim();
          if (text.includes('$') && text.length < 20) {
            price = text;
            break;
          }
        }
      }

      // ASIN extraction
      let asin = '';
      const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) {
        asin = asinMatch[1];
      } else {
        // Try to find ASIN in the page
        const asinEl = document.querySelector('[data-asin], input[name="ASIN"]');
        if (asinEl) {
          asin = asinEl.dataset.asin || asinEl.value;
        }
      }

      // Image extraction
      let image = '';
      const imgSelectors = [
        '#landingImage',
        '#imgBlkFront',
        '.a-dynamic-image',
        '[data-old-hires]',
        '.a-stretch-horizontal img'
      ];
      
      for (const selector of imgSelectors) {
        const el = document.querySelector(selector);
        if (el?.src) {
          image = el.src;
          break;
        }
      }

      log('Extracted data:', { title: title.substring(0, 30), price, asin: asin || 'none' });

      return { title, price, asin, image };
      
    } catch (error) {
      log('Error extracting product:', error);
      return null;
    }
  }

  function cleanTitle(title) {
    // Extract important specs before cleaning
    const ramMatch = title.match(/(\d+)\s?GB\s?(RAM|DDR)/i);
    const storageMatch = title.match(/(\d+)\s?(GB|TB)\s?(SSD|HDD|NVMe)/i);
    const gpuMatch = title.match(/(RTX\s?\d{3,4}|GTX\s?\d{3,4}|RX\s?\d{3,4})/i);
    
    let cleaned = title
      .replace(/\s+/g, ' ')
      .replace(/\|/g, ' ')
      .replace(/\b(Amazon|Prime|Best Seller|#1)\b/gi, '')
      .trim();
    
    // Keep important technical specs in the title
    return cleaned;
  }

  function truncateTitle(title, wordCount = CONFIG.TRUNCATE_WORDS) {
    // Clean the title first - remove special characters
    const cleaned = title
      .replace(/\s+/g, ' ')
      .replace(/\|/g, ' ')
      .replace(/[+–!()\[\]]/g, '') // Remove special characters
      .replace(/\b(Amazon|Prime|Best Seller|#1)\b/gi, '')
      .trim();
    
    // Split into words and take first N words (5 words for better search)
    const words = cleaned.split(/\s+/);
    const truncated = words.slice(0, wordCount).join(' ');
    
    log(`🔍 Title truncated from ${words.length} words to ${wordCount} words`);
    log(`   Original: "${title.substring(0, 80)}..."`);
    log(`   Shortened: "${truncated}"`);
    
    return truncated;
  }

  function parsePrice(priceText) {
    if (!priceText) return 0;
    const cleaned = priceText.replace(/[^\d.]/g, '');
    const match = cleaned.match(/\d+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }

  function createCardElement() {
    const card = document.createElement('div');
    card.id = CONFIG.CARD_ID;
    card.className = 'wc-price-hunter-card';
    return card;
  }

  async function searchAliExpress(query) {
    try {
      // NUCLEAR: Hard-code truncation to exactly 5 words
      const finalQuery = query.split(' ').slice(0, 5).join(' ').replace(/[+–!()\[\]]/g, '');
      
      console.log(`[DEBUG] Final Query: ${finalQuery}`);
      
      const url = `${CONFIG.BACKEND_URL}/api/search?query=${encodeURIComponent(finalQuery)}`;
      
      log('🔍 Searching AliExpress with nuclear query:', finalQuery);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        log('❌ No results found from backend');
        return { noMatch: true, query: shortenedQuery };
      }

      // Check if backend returned "no accurate match" error
      if (data.data.error === 'NO_ACCURATE_MATCH') {
        log('❌ No accurate match found on AliExpress');
        return { noMatch: true, query: shortenedQuery };
      }

      log('✅ AliExpress result found:', data.data.title?.substring(0, 40));
      return data.data;
      
    } catch (error) {
      log('❌ AliExpress search error:', error.message);
      return { noMatch: true, query: shortenedQuery };
    }
  }

  // STEP 2 & 3: Inject sidebar with dummy data and fixed CSS
  function injectSidebarWithDummyData() {
    if (sidebarContainer) {
      log('Sidebar already exists, skipping injection');
      return;
    }
    
    log('🚀 IMMEDIATE INJECTION: Creating sidebar with DUMMY DATA...');
    
    sidebarContainer = createCardElement();
    
    // STEP 3: Fix CSS Visibility - Force display with proper positioning
    sidebarContainer.style.position = 'fixed !important';
    sidebarContainer.style.right = '0 !important';
    sidebarContainer.style.top = '0 !important';
    sidebarContainer.style.width = '350px !important';
    sidebarContainer.style.height = '100vh !important';
    sidebarContainer.style.zIndex = '2147483647 !important';
    sidebarContainer.style.display = 'flex !important';
    sidebarContainer.style.flexDirection = 'column';
    sidebarContainer.style.background = 'white !important';
    sidebarContainer.style.boxShadow = '-4px 0 20px rgba(0,0,0,0.15)';
    sidebarContainer.style.overflowY = 'auto';
    
    document.body.appendChild(sidebarContainer);
    
    // STEP 2: Show 3 hardcoded dummy product cards
    renderDummyProducts();
    
    log('✅ Sidebar injected with DUMMY DATA and visible!');
  }
  
  // STEP 2: Render 3 hardcoded dummy product cards
  function renderDummyProducts() {
    sidebarContainer.innerHTML = `
      <div class="wc-card-header" style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div class="wc-card-title" style="font-size: 18px; font-weight: 700;">💎 WC Price Hunter Pro</div>
        <button class="wc-close-btn" onclick="this.closest('#${CONFIG.CARD_ID}').style.display='none'" style="position: absolute; right: 15px; top: 15px; background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 18px;">✕</button>
      </div>
      
      <div class="wc-card-body" style="padding: 20px; flex: 1; overflow-y: auto;">
        <div style="margin-bottom: 15px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">💰 DEMO MODE</div>
          <div style="font-size: 20px; font-weight: 700;">Showing Sample Products</div>
        </div>

        <!-- Dummy Product Card 1 -->
        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
          <div style="display: flex; gap: 12px; margin-bottom: 10px;">
            <div style="width: 80px; height: 80px; background: rgba(102, 126, 234, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px;">🎮</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 5px;">Gaming Mouse RGB Pro</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">⭐ 4.8 | 📦 5,000+ sold</div>
              <div style="font-size: 18px; font-weight: 700; color: #27ae60;">$15.99</div>
            </div>
          </div>
          <button style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">🛒 View on AliExpress</button>
        </div>

        <!-- Dummy Product Card 2 -->
        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
          <div style="display: flex; gap: 12px; margin-bottom: 10px;">
            <div style="width: 80px; height: 80px; background: rgba(102, 126, 234, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px;">⌨️</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 5px;">Mechanical Keyboard RGB</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">⭐ 4.6 | 📦 3,200+ sold</div>
              <div style="font-size: 18px; font-weight: 700; color: #27ae60;">$22.50</div>
            </div>
          </div>
          <button style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">🛒 View on AliExpress</button>
        </div>

        <!-- Dummy Product Card 3 -->
        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
          <div style="display: flex; gap: 12px; margin-bottom: 10px;">
            <div style="width: 80px; height: 80px; background: rgba(102, 126, 234, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px;">🎧</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 5px;">Wireless Gaming Headset</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">⭐ 4.9 | 📦 8,500+ sold</div>
              <div style="font-size: 18px; font-weight: 700; color: #27ae60;">$18.75</div>
            </div>
          </div>
          <button style="width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">🛒 View on AliExpress</button>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; font-size: 13px; color: #666; text-align: center;">
          💡 This is demo mode. Real product matching will load automatically.
        </div>
      </div>
    `;
  }
  
  // ROBUST MODE: Inject sidebar instantly on page load
  function injectSidebarInstantly() {
    if (sidebarContainer) {
      log('Sidebar already exists, skipping injection');
      return;
    }
    
    log('🚀 INSTANT INJECTION: Creating sidebar container...');
    
    sidebarContainer = createCardElement();
    
    // EMERGENCY: Use cssText to force all styles
    sidebarContainer.style.cssText = 'border: 20px solid red !important; display: block !important; visibility: visible !important; position: fixed !important; right: 0 !important; top: 0 !important; width: 350px !important; height: 100vh !important; z-index: 2147483647 !important; background: white !important;';
    
    console.log('[EMERGENCY] About to append sidebar to body');
    document.body.appendChild(sidebarContainer);
    console.log('[EMERGENCY] Sidebar appended to body successfully');
    
    // Show loading state immediately
    updateSidebarState('loading');
    
    // Animate in
    setTimeout(() => sidebarContainer.classList.add('wc-show'), 50);
    makeDraggable(sidebarContainer);
    
    log('✅ Sidebar injected and visible with RED BORDER!');
  }
  
  // State management system
  function updateSidebarState(state, data = null) {
    if (!sidebarContainer) {
      log('⚠️ Sidebar not initialized, creating it now...');
      injectSidebarInstantly();
      return;
    }
    
    currentState = state;
    log(`🔄 Updating sidebar state to: ${state}`);
    
    switch(state) {
      case 'loading':
        renderLoadingState();
        break;
      case 'success':
        renderSuccessState(data);
        break;
      case 'empty':
        renderEmptyState(data);
        break;
      default:
        log('Unknown state:', state);
    }
  }
  
  // Render loading state
  function renderLoadingState() {
    sidebarContainer.innerHTML = `
      <div class="wc-card-header">
        <div class="wc-card-title">🔍 WC Price Hunter Pro</div>
        <button class="wc-close-btn" onclick="this.closest('#${CONFIG.CARD_ID}').style.transform='translateX(100%)'">✕</button>
      </div>
      <div class="wc-card-body">
        <div class="wc-loading">
          <div class="wc-loading-spinner"></div>
          <p style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin-top: 12px;">Searching AliExpress for deals...</p>
        </div>
      </div>
    `;
  }
  
  // Render empty state with manual search button
  function renderEmptyState(data) {
    const query = data?.query || 'product';
    const customMessage = data?.message;
    const aliExpressSearchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
    
    sidebarContainer.innerHTML = `
      <div class="wc-card-header">
        <div class="wc-card-title">🔍 WC Price Hunter Pro</div>
        <button class="wc-close-btn" onclick="this.closest('#${CONFIG.CARD_ID}').style.transform='translateX(100%)'">✕</button>
      </div>
      <div class="wc-card-body">
        <div class="wc-no-match">
          <div class="wc-no-match-icon">🔍</div>
          <div class="wc-no-match-title">${customMessage || 'No Direct Match Found'}</div>
          ${!customMessage ? `<div class="wc-no-match-subtitle">We couldn't find a similar product on AliExpress for:<br><strong>"${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"</strong></div>` : ''}
          <div style="margin-top: 20px;">
            <button class="wc-btn wc-btn-primary" onclick="window.open('${aliExpressSearchUrl}', '_blank')" style="margin-bottom: 10px;">
              🔎 Try Manual Search on AliExpress
            </button>
          </div>
          <div style="margin-top: 15px; padding: 12px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; font-size: 13px; color: rgba(255, 255, 255, 0.6);">
            💡 Tip: ${customMessage ? 'This extension focuses on Gaming & Tech products only.' : 'Try searching manually or check back later for new listings.'}
          </div>
        </div>
      </div>
    `;
  }
  
  // Render success state with product cards
  function renderSuccessState(data) {
    const savingsHtml = data.isCheaper ? `
      <div class="wc-savings-badge">
        <div class="wc-savings-label">💰 PROFIT OPPORTUNITY</div>
        <div class="wc-savings-amount">$${data.savings.toFixed(2)}</div>
        <div class="wc-savings-percent">${data.savingsPercent}% CHEAPER than Amazon</div>
      </div>
    ` : `
      <div class="wc-savings-badge" style="border-color: rgba(255, 107, 107, 0.4);">
        <div class="wc-savings-label" style="color: rgba(255, 107, 107, 0.8);">📊 PRICE CHECK</div>
        <div class="wc-savings-amount" style="color: rgba(255, 255, 255, 0.7); font-size: 22px;">Amazon Wins</div>
        <div class="wc-savings-percent">Better deal on Amazon</div>
      </div>
    `;

    sidebarContainer.innerHTML = `
      <div class="wc-card-header">
        <div class="wc-card-title">💎 WC Price Hunter Pro</div>
        <button class="wc-close-btn" onclick="this.closest('#${CONFIG.CARD_ID}').style.transform='translateX(100%)'">✕</button>
      </div>
      
      <div class="wc-card-body">
        ${savingsHtml}

        <div class="wc-price-comparison">
          <div class="wc-price-row">
            <span class="wc-price-label">🛒 Amazon</span>
            <span class="wc-price-value wc-price-amazon">$${data.amazonPrice.toFixed(2)}</span>
          </div>
          <div class="wc-price-row">
            <span class="wc-price-label">📦 AliExpress</span>
            <span class="wc-price-value wc-price-ali">$${data.aliPrice.toFixed(2)}</span>
          </div>
        </div>

        <div class="wc-product-info">
          ${(data.aliProduct.image || data.amazonProduct.image) ? `
          <img src="${data.aliProduct.image || data.amazonProduct.image}" 
               class="wc-product-image" 
               alt="Product" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="wc-product-image-placeholder" style="display: none;">📦</div>
          ` : `
          <div class="wc-product-image-placeholder">📦</div>
          `}
          <div class="wc-product-details">
            <div class="wc-product-title">${(data.aliProduct.title || 'AliExpress Product').substring(0, 60)}${(data.aliProduct.title || '').length > 60 ? '...' : ''}</div>
            <div class="wc-product-meta">
              <span>⭐ ${data.aliProduct.rating || '4.5'}</span>
              <span>📦 ${data.aliProduct.orders || '1,000+'} sold</span>
              ${data.aliProduct.discount > 0 ? `<span class="wc-discount">-${data.aliProduct.discount}%</span>` : ''}
            </div>
          </div>
        </div>

        <div class="wc-action-buttons">
          <button class="wc-btn wc-btn-primary" data-action="buy" data-url="${data.aliProduct.affiliateUrl || data.aliProduct.url || data.aliProduct.aliUrl || ''}">
            🛒 Buy on AliExpress
          </button>
          <div class="wc-btn-row">
            <button class="wc-btn wc-btn-secondary" data-action="compare">
              💎 Full Comparison
            </button>
            <button class="wc-btn wc-btn-secondary" data-action="download">
              📥 Download Images
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Attach event handlers
    attachButtonHandlers(sidebarContainer, data);
  }
  
  function showLoadingCard() {
    updateSidebarState('loading');
  }

  function showPriceCard(data) {
    updateSidebarState('success', data);
  }

  function showNoMatchCard(query) {
    updateSidebarState('empty', { query });
  }

  function removeCard() {
    // In Robust Mode, we NEVER hide the card - it stays visible always
    // if (sidebarContainer) {
    //   sidebarContainer.style.display = 'none';
    // }
    log('⚠️ removeCard called but sidebar stays visible in Robust Mode');
  }

  function attachButtonHandlers(card, data) {
    const buttons = card.querySelectorAll('.wc-btn');
    
    buttons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const action = button.dataset.action;
        
        if (action === 'buy') {
          const url = button.dataset.url;
          
          // Validate URL
          if (!url || url === '' || url === 'undefined') {
            log('ERROR: No AliExpress URL available. Data:', data.aliProduct);
            showNotification('❌ Error', 'Product URL not available. Please try searching manually on AliExpress.');
            return;
          }
          
          // Ensure URL is valid
          if (!url.includes('aliexpress.com') && !url.includes('s.click.aliexpress.com')) {
            log('ERROR: Invalid AliExpress URL:', url);
            showNotification('❌ Error', 'Invalid product URL');
            return;
          }
          
          log('✅ Opening AliExpress product:', url);
          showNotification('🛒 Opening', 'Redirecting to AliExpress...');
          
          // Open in new tab
          const newWindow = window.open(url, '_blank');
          if (!newWindow) {
            showNotification('⚠️ Popup Blocked', 'Please allow popups for this site');
          }
        } else if (action === 'compare') {
          log('Opening full comparison view');
          showFullComparison(data);
        } else if (action === 'download') {
          log('Downloading product images');
          await downloadImages(data);
        }
      });
    });
  }

  function showFullComparison(data) {
    const comparisonWindow = window.open('', '_blank', 'width=900,height=700');
    
    if (!comparisonWindow) {
      showNotification('Error', 'Please allow popups for this site');
      return;
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Price Comparison - ${data.amazonProduct.title.substring(0, 50)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h1 {
            color: #333;
            margin-bottom: 30px;
            font-size: 28px;
          }
          .comparison-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .product-card {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
          }
          .product-card.winner {
            border-color: #27ae60;
            background: #f0fff4;
          }
          .product-card h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #555;
          }
          .product-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 15px;
          }
          .price {
            font-size: 32px;
            font-weight: 800;
            color: #27ae60;
            margin: 15px 0;
          }
          .price.expensive {
            color: #e74c3c;
            text-decoration: line-through;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-label {
            color: #666;
            font-weight: 500;
          }
          .detail-value {
            color: #333;
            font-weight: 600;
          }
          .savings-banner {
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
          }
          .savings-amount {
            font-size: 42px;
            font-weight: 800;
            margin: 10px 0;
          }
          .buy-btn {
            display: block;
            width: 100%;
            padding: 15px;
            background: #667eea;
            color: white;
            text-align: center;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 700;
            font-size: 16px;
            margin-top: 15px;
            transition: all 0.3s;
          }
          .buy-btn:hover {
            background: #5568d3;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>💰 Full Price Comparison</h1>
          
          ${data.isCheaper ? `
          <div class="savings-banner">
            <div style="font-size: 14px; opacity: 0.9;">YOU SAVE</div>
            <div class="savings-amount">$${data.savings.toFixed(2)}</div>
            <div style="font-size: 18px; font-weight: 600;">${data.savingsPercent}% CHEAPER on AliExpress</div>
          </div>
          ` : ''}
          
          <div class="comparison-grid">
            <div class="product-card">
              <h2>🛒 Amazon</h2>
              <img src="${data.amazonProduct.image || 'https://via.placeholder.com/200'}" alt="Amazon Product">
              <div class="price ${!data.isCheaper ? '' : 'expensive'}">$${data.amazonPrice.toFixed(2)}</div>
              <div class="detail-row">
                <span class="detail-label">Platform</span>
                <span class="detail-value">Amazon</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shipping</span>
                <span class="detail-value">Prime / Standard</span>
              </div>
            </div>
            
            <div class="product-card ${data.isCheaper ? 'winner' : ''}">
              <h2>📦 AliExpress ${data.isCheaper ? '✅ WINNER' : ''}</h2>
              <img src="${data.aliProduct.image || 'https://via.placeholder.com/200'}" alt="AliExpress Product">
              <div class="price">$${data.aliPrice.toFixed(2)}</div>
              <div class="detail-row">
                <span class="detail-label">Rating</span>
                <span class="detail-value">⭐ ${data.aliProduct.rating || '4.5'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Orders</span>
                <span class="detail-value">${data.aliProduct.orders || '1,000+'} sold</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Shipping</span>
                <span class="detail-value">${data.aliProduct.shippingCost > 0 ? '$' + data.aliProduct.shippingCost.toFixed(2) : 'Free'}</span>
              </div>
              ${data.aliProduct.deliveryDays ? `
              <div class="detail-row">
                <span class="detail-label">Delivery</span>
                <span class="detail-value">${data.aliProduct.deliveryDays} days</span>
              </div>
              ` : ''}
              <a href="${data.aliProduct.url || data.aliProduct.affiliateUrl || '#'}" target="_blank" class="buy-btn">
                🛒 Buy on AliExpress
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p><strong>Product:</strong> ${data.amazonProduct.title.substring(0, 100)}...</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    comparisonWindow.document.write(html);
    comparisonWindow.document.close();
  }

  async function downloadImages(data) {
    try {
      const images = [];
      
      if (data.amazonProduct.image) {
        images.push({ url: data.amazonProduct.image, name: 'amazon-product.jpg' });
      }
      
      if (data.aliProduct.image) {
        images.push({ url: data.aliProduct.image, name: 'aliexpress-product.jpg' });
      }
      
      if (images.length === 0) {
        showNotification('Error', 'No images available to download');
        return;
      }
      
      for (const img of images) {
        try {
          const response = await fetch(img.url);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = img.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          log('Error downloading image:', img.name, error);
        }
      }
      
      showNotification('Success', `Downloaded ${images.length} image(s)`);
    } catch (error) {
      log('Error in downloadImages:', error);
      showNotification('Error', 'Failed to download images');
    }
  }

  function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(10, 10, 15, 0.95);
      color: white;
      padding: 16px 20px;
      border-radius: 10px;
      border: 1px solid rgba(0, 212, 255, 0.5);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 2147483648;
      font-family: 'Segoe UI', sans-serif;
      min-width: 250px;
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 4px; color: #00d4ff;">${title}</div>
      <div style="font-size: 14px; color: rgba(255, 255, 255, 0.8);">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function makeDraggable(element) {
    const header = element.querySelector('.wc-card-header');
    if (!header) return;

    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - element.offsetLeft;
      initialY = e.clientY - element.offsetTop;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      const maxX = window.innerWidth - element.offsetWidth - 20;
      const maxY = window.innerHeight - element.offsetHeight - 20;
      
      currentX = Math.max(10, Math.min(currentX, maxX));
      currentY = Math.max(10, Math.min(currentY, maxY));

      element.style.left = currentX + 'px';
      element.style.top = currentY + 'px';
      element.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      header.style.cursor = 'move';
    });
  }

  // Error handling for extension context invalidated
  function isExtensionContextValid() {
    try {
      chrome.runtime.getManifest();
      return true;
    } catch (e) {
      return false;
    }
  }

  // Listen for messages from popup with error handling
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isExtensionContextValid()) {
      sendResponse({ error: 'Extension context invalidated' });
      return false;
    }
    
    if (request.action === 'getProductInfo') {
      log('Popup requested product info', currentProduct);
      
      if (currentProduct) {
        sendResponse({
          product: {
            asin: currentProduct.asin,
            title: currentProduct.title,
            amazonPrice: currentProduct.price,
            category: currentProduct.category
          }
        });
      } else {
        sendResponse({ product: null });
      }
      return true;
    }
  });

  log('WC Price Hunter v2.0 - Content script loaded successfully');
})();
