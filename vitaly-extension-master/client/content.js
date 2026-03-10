// WC Price Hunter - Premium Content Script with Price Tag Feature
// World-class affiliate price comparison tool

console.log('🚀 WC Price Hunter: Content script loaded');

class WCHunter {
  constructor() {
    this.backendUrl = 'http://127.0.0.1:52272';
    this.isSearching = false;
    this.buttonId = 'wc-hunter-button';
    this.panelId = 'wc-hunter-panel';
    
    this.init();
  }

  init() {
    console.log('🔍 WC Price Hunter: Initializing...');
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    console.log('⚡ WC Price Hunter: Setting up...');
    
    // Extract product info immediately
    const productInfo = this.extractProductInfo();
    
    if (productInfo) {
      console.log('📦 Product found:', productInfo.title, 'Price:', productInfo.price);
      this.injectFloatingButton(productInfo);
    } else {
      console.log('❌ No product found on this page');
    }
  }

  extractProductInfo() {
    try {
      // Extract product title
      const titleElement = document.getElementById('productTitle') || 
                          document.querySelector('[data-feature-name="productTitle"]') ||
                          document.querySelector('h1.a-size-large');
      
      const title = titleElement?.textContent?.trim();
      
      if (!title) return null;

      // Extract current URL
      const url = window.location.href;
      
      // Extract price - try multiple selectors
      const priceSelectors = [
        '.a-price-whole',
        '.a-offscreen',
        '[data-a-color="price"]',
        '.a-price .a-offscreen',
        '#price_inside_buybox',
        '.a-price.a-text-price.a-size-medium.apexPriceToPay',
        '.a-price-symbol'
      ];
      
      let price = '';
      for (const selector of priceSelectors) {
        const priceElement = document.querySelector(selector);
        if (priceElement) {
          price = priceElement.textContent?.trim() || '';
          // Clean price text
          price = price.replace(/[$,\s]/g, '');
          if (price && !isNaN(price)) {
            break;
          }
        }
      }

      // Extract price from aria-label as fallback
      if (!price) {
        const priceElements = document.querySelectorAll('[aria-label*="price"], [aria-label*="Price"]');
        for (const element of priceElements) {
          const ariaLabel = element.getAttribute('aria-label') || '';
          const priceMatch = ariaLabel.match(/\$?(\d+(?:\.\d{2})?)/);
          if (priceMatch) {
            price = priceMatch[1];
            break;
          }
        }
      }

      console.log('💰 Extracted price:', price, 'from selectors:', priceSelectors);

      return { title, url, price };
    } catch (error) {
      console.error('❌ Error extracting product info:', error);
      return null;
    }
  }

  injectFloatingButton(productInfo) {
    console.log('🎨 WC Price Hunter: Injecting premium button with price tag...');

    // Remove existing button if present
    const existingButton = document.getElementById(this.buttonId);
    if (existingButton) existingButton.remove();

    // Create premium floating button with price tag
    const button = document.createElement('div');
    button.id = this.buttonId;
    button.innerHTML = `
      <div class="wc-hunter-button-content">
        <div class="wc-hunter-icon">🔍</div>
        <div class="wc-hunter-text">Find on AliExpress</div>
        <div class="wc-hunter-price-tag" id="wc-price-tag">Checking...</div>
        <div class="wc-hunter-arrow">→</div>
      </div>
    `;

    // Add premium styles with red gradient and price tag
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 20px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 220px;
    `;

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 25px rgba(239, 68, 68, 0.5)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4)';
    });

    // Add click handler
    button.addEventListener('click', () => {
      this.searchAliExpress(productInfo);
    });

    // Inject into page immediately
    document.body.appendChild(button);
    
    // Start price checking in background
    this.checkAliExpressPrice(productInfo);
    
    console.log('✅ WC Price Hunter: Button with price tag injected successfully');
  }

  async checkAliExpressPrice(productInfo) {
    try {
      console.log('🔍 Checking AliExpress price for:', productInfo.title);
      
      // Quick price check with single search
      const response = await fetch(`${this.backendUrl}/api/search-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: productInfo.title,
          url: productInfo.url,
          maxResults: 1 // Just need first result for price
        })
      });

      const data = await response.json();
      
      if (data.success && data.data?.products?.length > 0) {
        const aliProduct = data.data.products[0];
        const amazonPrice = parseFloat(productInfo.price) || 0;
        const aliPrice = parseFloat(aliProduct.salePrice) || 0;
        
        console.log('💰 Price comparison:', {
          amazon: amazonPrice,
          aliexpress: aliPrice,
          difference: amazonPrice - aliPrice
        });

        // Update price tag
        const priceTag = document.getElementById('wc-price-tag');
        if (priceTag) {
          if (aliPrice > 0 && amazonPrice > aliPrice) {
            const savings = (amazonPrice - aliPrice).toFixed(2);
            priceTag.textContent = `Save $${savings}`;
            priceTag.style.background = 'rgba(34, 197, 94, 0.9)';
          } else if (aliPrice > 0) {
            priceTag.textContent = `$${aliPrice}`;
            priceTag.style.background = 'rgba(59, 130, 246, 0.9)';
          } else {
            priceTag.textContent = 'Check deals';
            priceTag.style.background = 'rgba(156, 163, 175, 0.9)';
          }
        }
      } else {
        console.log('❌ No AliExpress products found for price check');
        const priceTag = document.getElementById('wc-price-tag');
        if (priceTag) {
          priceTag.textContent = 'Check deals';
          priceTag.style.background = 'rgba(156, 163, 175, 0.9)';
        }
      }
    } catch (error) {
      console.error('❌ Price check failed:', error);
      const priceTag = document.getElementById('wc-price-tag');
      if (priceTag) {
        priceTag.textContent = 'Check deals';
        priceTag.style.background = 'rgba(156, 163, 175, 0.9)';
      }
    }
  }

  async searchAliExpress(productInfo) {
    if (this.isSearching) return;
    
    this.isSearching = true;
    console.log('🔍 WC Price Hunter: Searching AliExpress...');

    try {
      // Update button to show loading
      const button = document.getElementById(this.buttonId);
      if (button) {
        button.innerHTML = `
          <div class="wc-hunter-button-content">
            <div class="wc-hunter-spinner"></div>
            <div class="wc-hunter-text">Searching...</div>
          </div>
        `;
        button.style.pointerEvents = 'none';
      }

      // Call backend API
      const response = await fetch(`${this.backendUrl}/api/search-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: productInfo.title,
          url: productInfo.url,
          maxResults: 5
        })
      });

      const data = await response.json();
      
      if (data.success && data.data?.products) {
        console.log(`✅ Found ${data.data.products.length} products`);
        this.showResults(data.data.products, productInfo);
      } else {
        throw new Error(data.error?.message || 'No products found');
      }

    } catch (error) {
      console.error('❌ Search failed:', error);
      this.showError(error.message);
    } finally {
      this.isSearching = false;
      this.resetButton(productInfo);
    }
  }

  showResults(products, originalProduct) {
    console.log('🎉 WC Price Hunter: Showing results...');

    // Remove existing panel
    const existingPanel = document.getElementById(this.panelId);
    if (existingPanel) existingPanel.remove();

    // Create premium results panel
    const panel = document.createElement('div');
    panel.id = this.panelId;
    
    const productsHtml = products.map(product => `
      <div class="wc-hunter-product">
        <div class="wc-hunter-product-image">
          <img src="${product.imageUrl}" alt="${product.title}" />
        </div>
        <div class="wc-hunter-product-info">
          <div class="wc-hunter-product-title">${product.title}</div>
          <div class="wc-hunter-product-price">
            <span class="wc-hunter-current-price">$${product.salePrice}</span>
            ${product.originalPrice && product.originalPrice !== product.salePrice ? 
              `<span class="wc-hunter-original-price">$${product.originalPrice}</span>` : ''}
          </div>
          <div class="wc-hunter-product-stats">
            <span class="wc-hunter-rating">⭐ ${product.rating || 'N/A'}</span>
            <span class="wc-hunter-orders">📦 ${product.orders || '0'} sold</span>
          </div>
        </div>
        <div class="wc-hunter-product-action">
          <a href="${product.affiliateUrl}" target="_blank" class="wc-hunter-buy-btn">
            View Deal →
          </a>
        </div>
      </div>
    `).join('');

    panel.innerHTML = `
      <div class="wc-hunter-panel-overlay"></div>
      <div class="wc-hunter-panel-content">
        <div class="wc-hunter-panel-header">
          <h3>💎 Better Deals Found</h3>
          <button class="wc-hunter-close-btn">×</button>
        </div>
        <div class="wc-hunter-panel-body">
          <div class="wc-hunter-original">
            <div class="wc-hunter-original-title">Original Amazon Product:</div>
            <div class="wc-hunter-original-info">
              <div>${originalProduct.title}</div>
              <div class="wc-hunter-original-price">$${originalProduct.price || 'Price not available'}</div>
            </div>
          </div>
          <div class="wc-hunter-products-list">
            ${productsHtml}
          </div>
        </div>
      </div>
    `;

    // Add premium panel styles
    panel.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Add event listeners
    const closeBtn = panel.querySelector('.wc-hunter-close-btn');
    const overlay = panel.querySelector('.wc-hunter-panel-overlay');
    
    closeBtn.addEventListener('click', () => panel.remove());
    overlay.addEventListener('click', () => panel.remove());

    // Inject into page
    document.body.appendChild(panel);
    
    console.log('✅ WC Price Hunter: Results panel shown');
  }

  showError(message) {
    console.log('❌ WC Price Hunter: Showing error...');

    // Remove existing panel
    const existingPanel = document.getElementById(this.panelId);
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = this.panelId;
    
    panel.innerHTML = `
      <div class="wc-hunter-panel-overlay"></div>
      <div class="wc-hunter-panel-content wc-hunter-error-panel">
        <div class="wc-hunter-panel-header">
          <h3>❌ Search Failed</h3>
          <button class="wc-hunter-close-btn">×</button>
        </div>
        <div class="wc-hunter-panel-body">
          <p>${message}</p>
          <p>Please try again or check your internet connection.</p>
        </div>
      </div>
    `;

    panel.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const closeBtn = panel.querySelector('.wc-hunter-close-btn');
    const overlay = panel.querySelector('.wc-hunter-panel-overlay');
    
    closeBtn.addEventListener('click', () => panel.remove());
    overlay.addEventListener('click', () => panel.remove());

    document.body.appendChild(panel);
  }

  resetButton(productInfo) {
    const button = document.getElementById(this.buttonId);
    if (button) {
      button.innerHTML = `
        <div class="wc-hunter-button-content">
          <div class="wc-hunter-icon">🔍</div>
          <div class="wc-hunter-text">Find on AliExpress</div>
          <div class="wc-hunter-price-tag" id="wc-price-tag">Checking...</div>
          <div class="wc-hunter-arrow">→</div>
        </div>
      `;
      button.style.pointerEvents = 'auto';
      
      // Restart price checking
      this.checkAliExpressPrice(productInfo);
    }
  }
}

// Initialize immediately
new WCHunter();
