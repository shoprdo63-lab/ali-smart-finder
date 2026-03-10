import API_BASE_URL from '../config/api.js';
import type { AmazonProduct, AliExpressProduct, PriceComparison } from './types';

const BACKEND_API_URL = API_BASE_URL;

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
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
let currentProduct: AmazonProduct | null = null;
let isProcessing = false;

console.log('%c[AliSmart Finder] Content script loaded!', 'color: #667eea; font-size: 14px; font-weight: bold;');
console.log('[AliSmart Finder] Backend URL:', BACKEND_API_URL);

function log(...args: any[]) {
  if (CONFIG.DEBUG) {
    console.log('[AliSmart Finder]', ...args);
  }
}

function isAmazonProductPage(): boolean {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  const isAmazon = hostname.includes('amazon.');
  const isProductPage = pathname.includes('/dp/') || pathname.includes('/gp/product/');
  
  return isAmazon && isProductPage;
}

function isTechGamingProduct(title: string): boolean {
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

function extractProductData(): AmazonProduct | null {
  try {
    const titleElement = document.querySelector('#productTitle, #title');
    const priceElement = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole');
    const asinElement = document.querySelector('input[name="ASIN"]') as HTMLInputElement;
    const imageElement = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement;
    
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
    
    return {
      title,
      price,
      currency,
      url: window.location.href,
      asin,
      imageUrl
    };
  } catch (error) {
    log('Error extracting product data:', error);
    return null;
  }
}

async function searchAliExpress(query: string): Promise<AliExpressProduct[]> {
  const cacheKey = query.toLowerCase();
  const cached = CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
    log('Using cached results for:', query);
    return cached.data;
  }
  
  try {
    const url = `${CONFIG.BACKEND_URL}/api/search?query=${encodeURIComponent(query)}`;
    log('Fetching from backend:', url);
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success && result.data?.products) {
      CACHE.set(cacheKey, {
        data: result.data.products,
        timestamp: Date.now()
      });
      return result.data.products;
    }
    
    log('No products found or API error:', result);
    return [];
  } catch (error) {
    log('Error searching AliExpress:', error);
    return [];
  }
}

function calculateSavings(amazonPrice: number, aliPrice: number): { amount: number; percentage: number } | null {
  if (aliPrice >= amazonPrice) return null;
  return {
    amount: amazonPrice - aliPrice,
    percentage: Math.round(((amazonPrice - aliPrice) / amazonPrice) * 100)
  };
}

function findSmartOptions(products: AliExpressProduct[], amazonPrice: number): {
  cheapest: AliExpressProduct | null;
  bestValue: AliExpressProduct | null;
  topRated: AliExpressProduct | null;
} {
  if (products.length === 0) {
    return { cheapest: null, bestValue: null, topRated: null };
  }

  const cheapest = products.reduce((min, p) => 
    parseFloat(p.salePrice) < parseFloat(min.salePrice) ? p : min
  , products[0]);

  const highRated = products.filter(p => p.rating >= 4.7);
  const bestValue = highRated.length > 0 
    ? highRated.reduce((min, p) => 
        parseFloat(p.salePrice) < parseFloat(min.salePrice) ? p : min
      , highRated[0])
    : products.reduce((best, p) => 
        (p.rating / parseFloat(p.salePrice)) > (best.rating / parseFloat(best.salePrice)) ? p : best
      , products[0]);

  const topRated = products.reduce((max, p) => 
    p.orders > max.orders ? p : max
  , products[0]);

  return { cheapest, bestValue, topRated };
}

function createOptionCardHTML(
  product: AliExpressProduct,
  label: string,
  badge: string,
  amazonPrice: number,
  amazonCurrency: string
): string {
  const savings = calculateSavings(amazonPrice, parseFloat(product.salePrice));
  const savingsText = savings 
    ? `<div class="wc-option-savings">You Save ${amazonCurrency}${savings.amount.toFixed(2)} (${savings.percentage}%)</div>`
    : '';

  return `
    <div class="wc-option-card" data-url="${product.affiliateUrl}">
      <div class="wc-option-header">
        <span class="wc-option-label">${label}</span>
        <span class="wc-option-badge">${badge}</span>
      </div>
      <div class="wc-option-body">
        <img src="${product.imageUrl}" alt="${product.title}" class="wc-option-image" loading="lazy">
        <div class="wc-option-info">
          <div class="wc-option-title">${product.title.substring(0, 50)}${product.title.length > 50 ? '...' : ''}</div>
          <div class="wc-option-price">${product.currency}${product.salePrice}</div>
          ${savingsText}
        </div>
      </div>
    </div>
  `;
}

function createPriceCard(comparison: PriceComparison): HTMLElement {
  const existingCard = document.getElementById(CONFIG.CARD_ID);
  if (existingCard) {
    existingCard.remove();
  }
  
  const card = document.createElement('div');
  card.id = CONFIG.CARD_ID;
  card.className = 'wc-price-hunter-card';
  
  const amazonPrice = parseFloat(comparison.amazon.price);
  const amazonCurrency = comparison.amazon.currency;
  const { cheapest, bestValue, topRated } = findSmartOptions(comparison.aliexpress, amazonPrice);
  
  if (!cheapest) return card;
  
  const cheapestBadge = cheapest.rating >= 4.5 ? `⭐ ${cheapest.rating}` : '💰 Lowest';
  const bestValueBadge = bestValue && bestValue.rating >= 4.7 ? `⭐ ${bestValue.rating}` : '⭐ Best Value';
  const topRatedBadge = topRated && topRated.orders > 1000 ? '🔥 Popular' : `📦 ${topRated?.orders} orders`;

  card.innerHTML = `
    <div class="wc-card-header">
      <div class="wc-card-title">� Smart AliExpress Options</div>
      <button class="wc-card-close">×</button>
    </div>
    <div class="wc-card-body">
      <div class="wc-amazon-ref">
        <div class="wc-ref-label">Amazon Price</div>
        <div class="wc-ref-price">${amazonCurrency}${comparison.amazon.price}</div>
      </div>
      <div class="wc-options-list">
        ${createOptionCardHTML(cheapest, 'Cheapest', cheapestBadge, amazonPrice, amazonCurrency)}
        ${bestValue ? createOptionCardHTML(bestValue, 'Smart Choice', bestValueBadge, amazonPrice, amazonCurrency) : ''}
        ${topRated && topRated.id !== cheapest.id && topRated.id !== bestValue?.id 
          ? createOptionCardHTML(topRated, 'Top Rated', topRatedBadge, amazonPrice, amazonCurrency) 
          : ''}
      </div>
    </div>
  `;
  
  const optionCards = card.querySelectorAll('.wc-option-card');
  optionCards.forEach(optionCard => {
    optionCard.addEventListener('click', () => {
      const url = optionCard.getAttribute('data-url');
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  });
  
  const closeBtn = card.querySelector('.wc-card-close');
  closeBtn?.addEventListener('click', () => card.remove());
  
  makeDraggable(card);
  
  requestAnimationFrame(() => {
    card.classList.add('wc-show');
  });
  
  return card;
}

function makeDraggable(element: HTMLElement) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;
  
  const header = element.querySelector('.wc-card-header') as HTMLElement;
  if (!header) return;
  
  header.style.cursor = 'move';
  
  header.addEventListener('mousedown', (e: MouseEvent) => {
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
  
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    
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
    
    const amazonPrice = parseFloat(product.price);
    const hasCheaperOption = aliProducts.some(p => parseFloat(p.salePrice) < amazonPrice);
    
    if (!hasCheaperOption) {
      log('No cheaper AliExpress options found');
      return;
    }
    
    const comparison: PriceComparison = {
      amazon: product,
      aliexpress: aliProducts
    };
    
    const card = createPriceCard(comparison);
    document.body.appendChild(card);
    
    log('Smart options card displayed!');
  } catch (error) {
    log('Error processing product:', error);
  } finally {
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
} else {
  init();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProductInfo') {
    try {
      const product = extractProductData();
      if (product && product.title) {
        sendResponse({ product });
      } else {
        sendResponse({ product: null, error: 'No product found on this page' });
      }
    } catch (e) {
      sendResponse({ product: null, error: (e as Error).message });
    }
    return true;
  }
});
