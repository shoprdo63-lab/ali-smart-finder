const BACKEND_API_URL = 'https://ali-smart-finder.onrender.com';
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
    BACKEND_URL: BACKEND_API_URL,
    CARD_ID: 'wc-price-hunter-card',
    DEBUG: true,
    RETRY_ATTEMPTS: 15,
    RETRY_DELAY: 600,
    DEBOUNCE_DELAY: 1000,
    CACHE_DURATION: 5 * 60 * 1000
};
const CACHE = new Map();
let observer = null;
let debounceTimer = null;
let currentProduct = null;
let isProcessing = false;
console.error('!!! ALISMART LOADED AT START !!!');
console.log('%c[AliSmart Finder] Content script loaded!', 'color: #667eea; font-size: 14px; font-weight: bold;');
console.log('[AliSmart Finder] Backend URL:', BACKEND_API_URL);

// NUCLEAR OPTION: Force inject immediately even before body exists
if (window.location.hostname.includes('amazon.')) {
  // Prevent duplicate injection
  if (document.getElementById('ali-smart-sidebar')) {
    console.log('[AliSmart Finder] Sidebar already exists, skipping injection');
    return;
  }
  
  console.error('[NUCLEAR] Amazon detected - forcing immediate injection');
  
  // Inject directly into document.documentElement with proper container
  document.documentElement.innerHTML += `
    <div id="ali-smart-sidebar" style="position:fixed; top:0; right:0; width:350px; height:100vh; border:20px solid red; z-index:2147483647; background:white; color:black; overflow-y:auto;">
      <h1 style="padding:20px; margin:0; background:#f8f9fa; border-bottom:1px solid #eee;">AliSmart Finder</h1>
      <div id="ali-smart-content">
        <div id="ali-products-list">
          <div style="padding:20px; text-align:center;">
            <div style="display:inline-block; padding:10px 20px; background:#667eea; color:white; border-radius:4px;">
              ⏳ Searching...
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Also use MutationObserver to catch when body becomes available
  const observer = new MutationObserver((mutations) => {
    if (document.body && !document.querySelector('#wc-price-hunter-card')) {
      console.error('[NUCLEAR] Body detected - injecting sidebar');
      // Trigger search immediately if we're on a product page
      if (isAmazonProductPage()) {
        console.log('[NUCLEAR] Product page detected, starting search...');
        setTimeout(() => triggerSearch(), 500);
      } else {
        document.getElementById('ali-products-list').innerHTML = '<div style="padding:20px; color:#666;">Not a product page</div>';
      }
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
function log(...args) {
    if (CONFIG.DEBUG) {
        console.log('[AliSmart Finder]', ...args);
    }
}
function isAmazonProductPage() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const isAmazon = hostname.includes('amazon.');
    const isProductPage = pathname.includes('/dp/') || pathname.includes('/gp/product/');
    return isAmazon && isProductPage;
}
function isTechGamingProduct(title) {
    const lowerTitle = title.toLowerCase();
    const hasBlockedKeyword = BLOCKED_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
    if (hasBlockedKeyword) {
        log('Blocked product (non-tech):', title);
        return false;
    }
    const hasTechKeyword = TECH_GAMING_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
    if (hasTechKeyword) {
        log('Tech/Gaming product detected:', title);
        return true;
    }
    log('Product does not match tech/gaming criteria:', title);
    return false;
}
function extractProductData() {
    try {
        const titleElement = document.querySelector('#productTitle, #title');
        const priceElement = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole');
        const asinElement = document.querySelector('input[name="ASIN"]');
        const imageElement = document.querySelector('#landingImage, #imgBlkFront');
        if (!titleElement || !priceElement) {
            log('Could not find title or price elements');
            return null;
        }
        const title = titleElement.textContent?.trim() || '';
        const priceText = priceElement.textContent?.trim() || '';
        const asin = asinElement?.value || '';
        const imageUrl = imageElement?.src || '';
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        const price = priceMatch ? priceMatch[0].replace(',', '') : '';
        const currencyMatch = priceText.match(/[$£€¥]/);
        const currency = currencyMatch ? currencyMatch[0] : '$';
        if (!title || !price) {
            log('Missing required product data');
            return null;
        }
        // Keyword filter disabled - show on ALL Amazon products
        // if (!isTechGamingProduct(title)) {
        //   return null;
        // }
        return {
            title,
            price,
            currency,
            url: window.location.href,
            asin,
            imageUrl
        };
    }
    catch (error) {
        log('Error extracting product data:', error);
        return null;
    }
}
// Trigger search function
function triggerSearch() {
  if (isProcessing) return;
  
  console.log('[NUCLEAR] Triggering search...');
  const product = extractProductData();
  
  if (!product || !product.title) {
    console.log('[NUCLEAR] No product found');
    const listContainer = document.getElementById('ali-products-list');
    if (listContainer) {
      listContainer.innerHTML = '<div style="padding:20px; color:#666;">No product detected</div>';
    }
    return;
  }
  
  console.log('[NUCLEAR] Product found:', product.title);
  isProcessing = true;
  
  // Show searching state
  const listContainer = document.getElementById('ali-products-list');
  if (listContainer) {
    listContainer.innerHTML = `
      <div style="padding:20px; text-align:center;">
        <div style="display:inline-block; padding:10px 20px; background:#667eea; color:white; border-radius:4px;">
          ⏳ Searching for: ${product.title.split(' ').slice(0, 5).join(' ')}...
        </div>
      </div>
    `;
  }
  
  searchAliExpress(product.title);
}

// Update searchAliExpress to render results directly
async function searchAliExpress(query) {
    // NUCLEAR: Hard-code truncation to exactly 5 words and remove special chars
    const finalQuery = query.split(' ').slice(0, 5).join(' ').replace(/[+–!()\[\]]/g, '');
    
    console.log(`[DEBUG] Final Query: ${finalQuery}`);
    
    const cacheKey = finalQuery.toLowerCase();
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        log('Using cached results for:', finalQuery);
        renderProductsInList(cached.data, finalQuery);
        return cached.data;
    }
    try {
        const url = `${CONFIG.BACKEND_URL}/api/search?query=${encodeURIComponent(finalQuery)}`;
        log('Fetching from backend:', url);
        
        // Show loading state
        const listContainer = document.getElementById('ali-products-list');
        if (listContainer) {
          listContainer.innerHTML = `
            <div style="padding:20px; text-align:center;">
              <div style="display:inline-block; padding:10px 20px; background:#667eea; color:white; border-radius:4px;">
                ⏳ Fetching from API...
              </div>
            </div>
          `;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        if (result.success && result.data?.products) {
            CACHE.set(cacheKey, {
                data: result.data.products,
                timestamp: Date.now()
            });
            renderProductsInList(result.data.products, finalQuery);
            return result.data.products;
        }
        log('No products found or API error:', result);
        renderProductsInList([], finalQuery);
        return [];
    }
    catch (error) {
        log('Error searching AliExpress:', error);
        const listContainer = document.getElementById('ali-products-list');
        if (listContainer) {
          listContainer.innerHTML = `
            <div style="padding:20px; color:red; text-align:center;">
              ❌ Search failed: ${error.message}
            </div>
          `;
        }
        return [];
    }
    finally {
      isProcessing = false;
    }
}

// Render products directly in ali-products-list
function renderProductsInList(products, query) {
  const listContainer = document.getElementById('ali-products-list');
  if (!listContainer) return;
  
  if (products.length === 0) {
    listContainer.innerHTML = `
      <div style="padding:20px; text-align:center;">
        <div style="color:#666; margin-bottom:10px;">No AliExpress products found</div>
        <div style="font-size:12px; color:#999;">Searched for: ${query}</div>
      </div>
    `;
    return;
  }
  
  const html = products.slice(0, 5).map(product => `
    <div style="padding:15px; border-bottom:1px solid #eee;">
      <div style="display:flex; gap:15px;">
        <img src="${product.imageUrl || ''}" style="width:80px; height:80px; object-fit:cover; border-radius:4px; background:#f5f5f5;" onerror="this.style.display='none'">
        <div style="flex:1;">
          <h4 style="margin:0 0 8px 0; font-size:13px; line-height:1.3;">${product.title}</h4>
          <div style="color:#27ae60; font-weight:bold; font-size:16px; margin-bottom:5px;">$${product.salePrice}</div>
          <div style="color:#666; font-size:11px; margin-bottom:10px;">⭐ ${product.rating || 'N/A'} | 📦 ${product.orders || 'N/A'} sold</div>
          <a href="${product.productUrl}" target="_blank" style="display:inline-block; padding:6px 12px; background:#667eea; color:white; text-decoration:none; border-radius:4px; font-size:11px;">View Deal →</a>
        </div>
      </div>
    </div>
  `).join('');
  
  listContainer.innerHTML = `
    <div style="padding:15px; background:#f0f8ff; border-bottom:1px solid #ddd;">
      <div style="font-size:12px; color:#666; margin-bottom:5px;">Found ${products.length} results for:</div>
      <div style="font-weight:bold; font-size:13px;">${query}</div>
    </div>
    ${html}
  `;
}
function filterSmartOptions(aliProducts, amazonPrice) {
    // Filter products cheaper than Amazon
    const cheaperProducts = aliProducts.filter(p => parseFloat(p.salePrice) < amazonPrice);
    if (cheaperProducts.length === 0) return null;

    // 1. Cheapest: Absolute lowest price
    const cheapest = cheaperProducts.reduce((min, p) => 
        parseFloat(p.salePrice) < parseFloat(min.salePrice) ? p : min
    );

    // 2. Smart Choice: High rating (4.7+) with competitive price
    const smartChoice = cheaperProducts
        .filter(p => parseFloat(p.rating) >= 4.7)
        .sort((a, b) => {
            const ratingDiff = parseFloat(b.rating) - parseFloat(a.rating);
            if (Math.abs(ratingDiff) > 0.2) return ratingDiff;
            return parseFloat(a.salePrice) - parseFloat(b.salePrice);
        })[0] || cheapest;

    // 3. Top Rated: Most orders/reviews
    const topRated = cheaperProducts.reduce((max, p) => {
        const pOrders = parseInt(p.orders) || 0;
        const maxOrders = parseInt(max.orders) || 0;
        return pOrders > maxOrders ? p : max;
    });

    return { cheapest, smartChoice, topRated };
}

function createPriceCard(comparison) {
    const existingCard = document.getElementById(CONFIG.CARD_ID);
    if (existingCard) {
        existingCard.remove();
    }
    const card = document.createElement('div');
    card.id = CONFIG.CARD_ID;
    card.className = 'wc-price-hunter-card';
    
    const amazonPrice = parseFloat(comparison.amazon.price);
    const smartOptions = filterSmartOptions(comparison.aliexpress, amazonPrice);
    
    if (!smartOptions) return card;

    const { cheapest, smartChoice, topRated } = smartOptions;

    const createOptionCard = (product, label, badge, badgeEmoji) => {
        const savings = amazonPrice - parseFloat(product.salePrice);
        const savingsPercent = Math.round((savings / amazonPrice) * 100);
        
        return `
            <div class="wc-option-card" data-url="${product.affiliateUrl}">
                <div class="wc-option-badge">${badgeEmoji} ${badge}</div>
                <div class="wc-option-label">${label}</div>
                <div class="wc-option-price">${product.currency}${product.salePrice}</div>
                <div class="wc-option-savings">You Save: ${comparison.amazon.currency}${savings.toFixed(2)} (${savingsPercent}%)</div>
                <div class="wc-option-meta">
                    <span>⭐ ${product.rating}</span>
                    <span>📦 ${product.orders}</span>
                </div>
            </div>
        `;
    };

    card.innerHTML = `
        <div class="wc-card-header">
            <div class="wc-card-title">💰 Cheaper on AliExpress</div>
            <button class="wc-card-close">×</button>
        </div>
        <div class="wc-card-body">
            ${createOptionCard(cheapest, 'Cheapest', 'Lowest', '💰')}
            ${createOptionCard(smartChoice, 'Smart Choice', smartChoice.rating, '⭐')}
            ${createOptionCard(topRated, 'Top Rated', 'Popular', '🔥')}
        </div>
    `;
    
    const closeBtn = card.querySelector('.wc-card-close');
    closeBtn?.addEventListener('click', () => card.remove());
    
    // Add click handlers to option cards
    const optionCards = card.querySelectorAll('.wc-option-card');
    optionCards.forEach(optionCard => {
        optionCard.addEventListener('click', () => {
            const url = optionCard.getAttribute('data-url');
            if (url) window.open(url, '_blank');
        });
    });
    
    makeDraggable(card);
    return card;
}
function makeDraggable(element) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    const header = element.querySelector('.wc-card-header');
    if (!header)
        return;
    header.style.cursor = 'move';
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        element.style.position = 'fixed';
        element.style.left = initialX + 'px';
        element.style.top = initialY + 'px';
        element.style.right = 'auto';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging)
            return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        element.style.left = (initialX + deltaX) + 'px';
        element.style.top = (initialY + deltaY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
        }
    });
}
async function processProduct() {
    if (isProcessing) {
        log('Already processing, skipping...');
        return;
    }
    isProcessing = true;
    try {
        const product = extractProductData();
        if (!product) {
            log('No valid product found');
            return;
        }
        if (currentProduct?.title === product.title) {
            log('Same product, skipping...');
            return;
        }
        currentProduct = product;
        log('Processing product:', product.title);
        const aliProducts = await searchAliExpress(product.title);
        if (aliProducts.length === 0) {
            log('No AliExpress products found');
            return;
        }
        const cheapest = aliProducts[0];
        const amazonPrice = parseFloat(product.price);
        const aliPrice = parseFloat(cheapest.salePrice);
        if (aliPrice >= amazonPrice) {
            log('AliExpress not cheaper, skipping card');
            return;
        }
        const savings = {
            amount: amazonPrice - aliPrice,
            percentage: Math.round(((amazonPrice - aliPrice) / amazonPrice) * 100)
        };
        const comparison = {
            amazon: product,
            aliexpress: aliProducts,
            cheapestAliExpress: cheapest,
            savings
        };
        const card = createPriceCard(comparison);
        document.body.appendChild(card);
        log('Price card displayed!');
    }
    catch (error) {
        log('Error processing product:', error);
    }
    finally {
        isProcessing = false;
    }
}
function debounceProcess() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
        processProduct();
    }, CONFIG.DEBOUNCE_DELAY);
}
// Render results in the nuclear sidebar
function renderSidebarResults(products, amazonProduct) {
  const contentDiv = document.getElementById('ali-smart-content');
  if (!contentDiv) return;
  
  if (products.length === 0) {
    contentDiv.innerHTML = `
      <div style="padding:20px;">
        <h3>No AliExpress products found</h3>
        <p>Query: ${amazonProduct.title}</p>
      </div>
    `;
    return;
  }
  
  const html = products.slice(0, 3).map(product => `
    <div style="padding:15px; border-bottom:1px solid #eee;">
      <h4 style="margin:0 0 10px 0; font-size:14px;">${product.title}</h4>
      <div style="color:#27ae60; font-weight:bold; font-size:18px;">$${product.salePrice}</div>
      <div style="color:#666; font-size:12px; margin:5px 0;">⭐ ${product.rating || 'N/A'} | 📦 ${product.orders || 'N/A'} sold</div>
      <a href="${product.productUrl}" target="_blank" style="display:inline-block; margin-top:10px; padding:8px 16px; background:#667eea; color:white; text-decoration:none; border-radius:4px; font-size:12px;">View on AliExpress</a>
    </div>
  `).join('');
  
  contentDiv.innerHTML = `
    <div style="padding:20px;">
      <h3 style="margin:0 0 15px 0;">AliExpress Deals</h3>
      <div style="background:#f0f8ff; padding:10px; border-radius:4px; margin-bottom:15px;">
        <div style="font-size:12px; color:#666;">Searched for:</div>
        <div style="font-weight:bold;">${amazonProduct.title}</div>
      </div>
      ${html}
    </div>
  `;
}

// Nuclear product detection
function attemptProductDetection() {
  if (isProcessing) return;
  
  console.log('[NUCLEAR] Starting product detection...');
  const product = extractProductData();
  
  if (!product || !product.title) {
    console.log('[NUCLEAR] No product found');
    const contentDiv = document.getElementById('ali-smart-content');
    if (contentDiv) {
      contentDiv.innerHTML = '<div style="padding:20px;">No product detected on this page</div>';
    }
    return;
  }
  
  console.log('[NUCLEAR] Product found:', product.title);
  isProcessing = true;
  
  searchAliExpress(product.title).then(products => {
    renderSidebarResults(products, product);
    isProcessing = false;
  }).catch(error => {
    console.error('[NUCLEAR] Search error:', error);
    const contentDiv = document.getElementById('ali-smart-content');
    if (contentDiv) {
      contentDiv.innerHTML = '<div style="padding:20px; color:red;">Search failed: ' + error.message + '</div>';
    }
    isProcessing = false;
  });
}

function init() {
    log('Initializing AliSmart Finder...');
    if (!isAmazonProductPage()) {
        log('Not an Amazon product page, skipping');
        return;
    }
    log('Amazon product page detected!');
    debounceProcess();
    observer = new MutationObserver(() => {
        debounceProcess();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getProductInfo') {
        try {
            const product = extractProductData();
            if (product && product.title) {
                sendResponse({ product });
            }
            else {
                sendResponse({ product: null, error: 'No product found on this page' });
            }
        }
        catch (e) {
            sendResponse({ product: null, error: e.message });
        }
        return true;
    }
});
