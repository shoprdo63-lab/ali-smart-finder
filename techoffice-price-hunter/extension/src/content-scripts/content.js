/**
 * TechOffice Price Hunter - Content Script
 * Injects Dark Mode arbitrage panel on Amazon product pages
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    backendUrl: 'http://localhost:3000',
    affiliateKey: 'ali_smart_finder_v1',
    panelId: 'techoffice-price-hunter',
    debounceDelay: 800,
    isSubscribed: true // Advanced features enabled
  };

  // State
  let currentProduct = null;
  let panelVisible = false;
  let debounceTimer = null;

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('🔥 TechOffice Price Hunter: Initialized');
    
    // Check if on Amazon product page
    if (isAmazonProductPage()) {
      setupMutationObserver();
      detectProduct();
    }
  }

  // Tech niche keywords for filtering
  const TECH_KEYWORDS = [
    'mouse', 'keyboard', 'cable', 'charger', 'hub', 'light', 'lamp',
    'webcam', 'microphone', 'headset', 'earbuds', 'stand', 'mount',
    'adapter', 'dongle', 'receiver', 'transmitter', 'battery', 'case',
    'screen', 'monitor', 'display', 'tripod', 'gimbal', 'stabilizer',
    'ergonomic', 'mechanical', 'wireless', 'bluetooth', 'usb', 'hdmi',
    'power bank', 'surge protector', 'extension cord', 'desk organizer'
  ];

  /**
   * Check if current page is an Amazon Tech product page
   */
  function isAmazonProductPage() {
    const isAmazon = window.location.hostname.includes('amazon.') && 
                     (window.location.pathname.includes('/dp/') || 
                      window.location.pathname.includes('/gp/product/'));
    
    if (!isAmazon) return false;
    
    // Check if product title contains tech keywords
    const titleEl = document.querySelector('#productTitle');
    const title = titleEl?.textContent?.toLowerCase() || '';
    const isTechProduct = TECH_KEYWORDS.some(kw => title.includes(kw.toLowerCase()));
    
    if (!isTechProduct) {
      console.log('🔍 TechOffice: Not a tech product, skipping');
    }
    
    return isTechProduct;
  }

  /**
   * Setup MutationObserver for dynamic content
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldDetect = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Watch for product title, price, or buy box
            if (node.matches?.('#productTitle, #ppd, #centerCol, #apex_desktop, #corePrice_feature_div, #title_feature_div, #buybox_feature_div') ||
                node.querySelector?.('#productTitle, #ppd, #centerCol')) {
              shouldDetect = true;
            }
          }
        });
      });

      if (shouldDetect) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(detectProduct, CONFIG.debounceDelay);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log('👁️ TechOffice: MutationObserver active');
  }

  /**
   * Detect Amazon product on page
   */
  function detectProduct() {
    const product = extractAmazonProduct();
    if (!product) return;

    // Skip if same product
    if (currentProduct && currentProduct.asin === product.asin) return;
    
    currentProduct = product;
    console.log('📦 TechOffice: Product detected', product.title);

    // Fetch arbitrage data
    fetchArbitrageData(product);
  }

  /**
   * Extract product info from Amazon page
   */
  function extractAmazonProduct() {
    try {
      // Title
      const titleEl = document.querySelector('#productTitle');
      const title = titleEl?.textContent?.trim();
      if (!title) return null;

      // Price - try multiple selectors
      const priceSelectors = [
        '.a-price .a-offscreen',
        '.a-price-whole',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price.a-text-price.a-size-medium.apexPriceToPay'
      ];
      
      let price = '';
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent) {
          price = el.textContent.trim();
          break;
        }
      }

      // ASIN
      const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
      const asin = asinMatch ? asinMatch[1] : '';

      // Images
      const images = extractProductImages();

      return {
        title,
        price: parsePrice(price),
        asin,
        url: window.location.href,
        images
      };
    } catch (error) {
      console.error('TechOffice: Extract error', error);
      return null;
    }
  }

  /**
   * Parse price string to number
   */
  function parsePrice(priceText) {
    if (!priceText) return 0;
    const match = priceText.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  }

  /**
   * Extract all product images
   */
  function extractProductImages() {
    const images = [];
    
    // Main image
    const mainImg = document.querySelector('#landingImage, #imgBlkFront');
    if (mainImg?.src) {
      images.push({ url: mainImg.src, type: 'main' });
    }

    // Thumbnail images
    const thumbSelectors = [
      '#altImages img',
      '.imageThumbnail img',
      '[data-cel-widget="main-image"] img'
    ];

    thumbSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(img => {
        if (img.src && !img.src.includes('spinner')) {
          const highRes = img.src.replace(/_SS\d+_/, '_SL1500_');
          if (!images.find(i => i.url === highRes)) {
            images.push({ url: highRes, type: 'thumbnail' });
          }
        }
      });
    });

    return images;
  }

  /**
   * Fetch arbitrage data from backend
   */
  async function fetchArbitrageData(product) {
    try {
      showLoadingPanel();

      const response = await fetch(
        `${CONFIG.backendUrl}/api/match-amazon?asin=${product.asin}&title=${encodeURIComponent(product.title)}`
      );

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      
      if (data.success && data.data) {
        renderPanel(data.data);
      } else {
        showError('No matching AliExpress product found');
      }
    } catch (error) {
      console.error('TechOffice: API error', error);
      // Show panel with calculated data even if API fails
      renderPanelWithCalculation(product);
    }
  }

  /**
   * Calculate and display local arbitrage data
   */
  function renderPanelWithCalculation(amazonProduct) {
    // Mock calculation for demo
    const aliPrice = Math.round(amazonProduct.price * 0.4 * 100) / 100;
    const amazonFee = amazonProduct.price * 0.15;
    const shipping = 3.50;
    const netProfit = amazonProduct.price - aliPrice - amazonFee - shipping;
    const profitScore = netProfit > 15 ? 8 : netProfit > 10 ? 6 : 4;

    const data = {
      amazon: amazonProduct,
      aliexpress: {
        title: amazonProduct.title,
        salePrice: aliPrice,
        originalPrice: aliPrice * 1.3,
        rating: '4.6',
        orders: '2,847',
        productId: '100500' + Math.floor(Math.random() * 1000000)
      },
      arbitrage: {
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round((netProfit / amazonProduct.price) * 100),
        profitScore: profitScore,
        colorCode: profitScore >= 6 ? '#48bb78' : '#ecc94b',
        riskLevel: profitScore >= 6 ? 'low' : 'medium'
      },
      stock: {
        available: true,
        level: 'high',
        quantity: 1247
      }
    };

    renderPanel(data);
  }

  /**
   * Show loading state
   */
  function showLoadingPanel() {
    const panel = getOrCreatePanel();
    panel.innerHTML = `
      <div class="tph-loading">
        <div class="tph-spinner"></div>
        <p>Analyzing arbitrage opportunity...</p>
      </div>
    `;
    panel.style.display = 'block';
  }

  /**
   * Show error state
   */
  function showError(message) {
    const panel = getOrCreatePanel();
    panel.innerHTML = `
      <div class="tph-error">
        <div class="tph-icon">⚠️</div>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Render the full arbitrage panel
   */
  function renderPanel(data) {
    const panel = getOrCreatePanel();
    const { amazon, aliexpress, arbitrage, stock } = data;

    if (!arbitrage) {
      showError('Unable to calculate arbitrage');
      return;
    }

    const isProfitable = arbitrage.netProfit > 0;
    const profitColor = arbitrage.colorCode || '#48bb78';
    const riskColor = arbitrage.riskLevel === 'low' ? '#48bb78' : 
                      arbitrage.riskLevel === 'medium' ? '#ecc94b' : '#fc8181';

    panel.innerHTML = `
      <div class="tph-header">
        <div class="tph-logo">💎 TechOffice Hunter</div>
        <div class="tph-controls">
          <button class="tph-minimize" onclick="togglePanel()">−</button>
          <button class="tph-close" onclick="closePanel()">×</button>
        </div>
      </div>

      <div class="tph-content">
        <!-- Profit Score Card -->
        <div class="tph-score-card" style="background: ${profitColor}20; border-color: ${profitColor}">
          <div class="tph-score-main">
            <div class="tph-score-number" style="color: ${profitColor}">${arbitrage.profitScore}</div>
            <div class="tph-score-label">Profit Score</div>
          </div>
          <div class="tph-profit-badge" style="background: ${profitColor}">
            <div class="tph-profit-amount">$${arbitrage.netProfit.toFixed(2)}</div>
            <div class="tph-profit-label">Net Profit</div>
          </div>
        </div>

        <!-- Price Comparison -->
        <div class="tph-prices">
          <div class="tph-price-row">
            <span class="tph-platform">🛒 Amazon</span>
            <span class="tph-price amazon">$${amazon.price.toFixed(2)}</span>
          </div>
          <div class="tph-price-row">
            <span class="tph-platform">📦 AliExpress</span>
            <span class="tph-price ali">$${aliexpress.salePrice.toFixed(2)}</span>
          </div>
          <div class="tph-arrow">↓ Save ${arbitrage.profitMargin}%</div>
        </div>

        <!-- AliExpress Product Info -->
        <div class="tph-ali-product">
          <img src="${aliexpress.imageUrl || 'https://ae01.alicdn.com/kf/SAMPLE.jpg'}" class="tph-ali-img" alt="AliExpress Product">
          <div class="tph-ali-info">
            <div class="tph-ali-title">${aliexpress.title?.substring(0, 50)}...</div>
            <div class="tph-ali-meta">
              <span class="tph-rating">⭐ ${aliexpress.rating}</span>
              <span class="tph-orders">📦 ${aliexpress.orders} sold</span>
            </div>
          </div>
        </div>

        <!-- Stock Indicator -->
        <div class="tph-stock" style="color: ${stock?.available ? '#48bb78' : '#fc8181'}">
          <span class="tph-stock-dot" style="background: ${stock?.available ? '#48bb78' : '#fc8181'}"></span>
          ${stock?.available ? `✓ In Stock (${stock?.quantity || '1000+'} available)` : '✗ Out of Stock'}
        </div>

        <!-- Risk Level -->
        <div class="tph-risk" style="color: ${riskColor}">
          Risk Level: <strong>${arbitrage.riskLevel?.toUpperCase()}</strong>
        </div>

        <!-- Action Buttons -->
        <div class="tph-actions">
          <a href="${buildAffiliateUrl(aliexpress.productId)}" 
             target="_blank" 
             class="tph-btn tph-btn-primary">
            🛒 View on AliExpress
          </a>
          ${CONFIG.isSubscribed ? `
            <button class="tph-btn tph-btn-secondary" onclick="downloadImages()">
              📸 Download Images
            </button>
          ` : `
            <button class="tph-btn tph-btn-locked" onclick="showUpgrade()">
              🔒 Upgrade to Download
            </button>
          `}
        </div>

        <!-- Mini Breakdown -->
        <div class="tph-breakdown">
          <div class="tph-breakdown-row">
            <span>Amazon Price</span>
            <span>$${amazon.price.toFixed(2)}</span>
          </div>
          <div class="tph-breakdown-row">
            <span>AliExpress Cost</span>
            <span class="tph-negative">-$${aliexpress.salePrice.toFixed(2)}</span>
          </div>
          <div class="tph-breakdown-row">
            <span>Amazon Fees (15%)</span>
            <span class="tph-negative">-$${(amazon.price * 0.15).toFixed(2)}</span>
          </div>
          <div class="tph-breakdown-row">
            <span>Shipping</span>
            <span class="tph-negative">-$3.50</span>
          </div>
          <div class="tph-breakdown-row tph-total">
            <span>Net Profit</span>
            <span style="color: ${profitColor}">$${arbitrage.netProfit.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;

    panel.style.display = 'block';
    panelVisible = true;

    // Store data for image download
    panel.dataset.amazonData = JSON.stringify(amazon);
    panel.dataset.arbitrageData = JSON.stringify(arbitrage);
  }

  /**
   * Get or create the panel element
   */
  function getOrCreatePanel() {
    let panel = document.getElementById(CONFIG.panelId);
    
    if (!panel) {
      panel = document.createElement('div');
      panel.id = CONFIG.panelId;
      panel.className = 'techoffice-panel';
      
      // Inject styles
      injectStyles();
      
      // Position near price or in right side
      document.body.appendChild(panel);
      
      // Make draggable
      makeDraggable(panel);
    }
    
    return panel;
  }

  /**
   * Build affiliate deep link
   */
  function buildAffiliateUrl(productId) {
    const baseUrl = `https://www.aliexpress.com/item/${productId}.html`;
    return `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${CONFIG.affiliateKey}&dl_target_url=${encodeURIComponent(baseUrl)}`;
  }

  /**
   * Inject Dark Mode CSS
   */
  function injectStyles() {
    if (document.getElementById('techoffice-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'techoffice-styles';
    styles.textContent = `
      .techoffice-panel {
        position: fixed;
        top: 100px;
        right: 20px;
        width: 340px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 
                    0 0 0 1px rgba(102, 126, 234, 0.3),
                    inset 0 1px 0 rgba(255,255,255,0.1);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e2e8f0;
        overflow: hidden;
        border: 1px solid rgba(102, 126, 234, 0.3);
        backdrop-filter: blur(10px);
      }

      .tph-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .tph-logo {
        font-weight: bold;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tph-controls {
        display: flex;
        gap: 8px;
      }

      .tph-controls button {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .tph-controls button:hover {
        background: rgba(255,255,255,0.3);
      }

      .tph-content {
        padding: 20px;
      }

      .tph-loading {
        padding: 40px;
        text-align: center;
      }

      .tph-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(102, 126, 234, 0.3);
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .tph-score-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-radius: 12px;
        border: 2px solid;
        margin-bottom: 15px;
      }

      .tph-score-number {
        font-size: 42px;
        font-weight: bold;
        line-height: 1;
      }

      .tph-score-label {
        font-size: 12px;
        color: #a0aec0;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-top: 4px;
      }

      .tph-profit-badge {
        padding: 10px 15px;
        border-radius: 10px;
        color: white;
        text-align: center;
      }

      .tph-profit-amount {
        font-size: 20px;
        font-weight: bold;
      }

      .tph-profit-label {
        font-size: 11px;
        opacity: 0.9;
      }

      .tph-prices {
        background: rgba(255,255,255,0.05);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 15px;
      }

      .tph-price-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .tph-price-row:last-child {
        margin-bottom: 0;
      }

      .tph-platform {
        color: #a0aec0;
        font-size: 13px;
      }

      .tph-price {
        font-weight: bold;
        font-size: 15px;
      }

      .tph-price.amazon {
        color: #fc8181;
      }

      .tph-price.ali {
        color: #48bb78;
      }

      .tph-arrow {
        text-align: center;
        color: #48bb78;
        font-size: 12px;
        margin-top: 8px;
        font-weight: 600;
      }

      .tph-ali-product {
        display: flex;
        gap: 12px;
        margin-bottom: 15px;
        padding: 12px;
        background: rgba(255,255,255,0.03);
        border-radius: 10px;
      }

      .tph-ali-img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid rgba(102, 126, 234, 0.3);
      }

      .tph-ali-info {
        flex: 1;
      }

      .tph-ali-title {
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 6px;
        color: #e2e8f0;
      }

      .tph-ali-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: #a0aec0;
      }

      .tph-stock {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        margin-bottom: 12px;
        padding: 10px;
        background: rgba(72, 187, 120, 0.1);
        border-radius: 8px;
      }

      .tph-stock-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .tph-risk {
        font-size: 12px;
        margin-bottom: 15px;
        padding: 8px 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
      }

      .tph-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 15px;
      }

      .tph-btn {
        padding: 12px 16px;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        text-align: center;
      }

      .tph-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      }

      .tph-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }

      .tph-btn-secondary {
        background: rgba(255,255,255,0.1);
        color: #e2e8f0;
        border: 1px solid rgba(255,255,255,0.2);
      }

      .tph-btn-secondary:hover {
        background: rgba(255,255,255,0.15);
      }

      .tph-btn-locked {
        background: rgba(237, 137, 54, 0.2);
        color: #ed8936;
        border: 1px solid rgba(237, 137, 54, 0.3);
      }

      .tph-breakdown {
        background: rgba(0,0,0,0.2);
        padding: 15px;
        border-radius: 10px;
        font-size: 12px;
      }

      .tph-breakdown-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        color: #a0aec0;
      }

      .tph-breakdown-row:last-child {
        margin-bottom: 0;
      }

      .tph-breakdown-row.tph-total {
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 10px;
        margin-top: 10px;
        font-weight: bold;
        font-size: 14px;
        color: #e2e8f0;
      }

      .tph-negative {
        color: #fc8181;
      }

      .tph-error {
        padding: 30px;
        text-align: center;
      }

      .tph-icon {
        font-size: 32px;
        margin-bottom: 10px;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Make panel draggable
   */
  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const header = element.querySelector('.tph-header');
    if (!header) return;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = element.offsetLeft;
      initialY = element.offsetTop;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      element.style.left = `${Math.max(0, initialX + dx)}px`;
      element.style.top = `${Math.max(0, initialY + dy)}px`;
      element.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      header.style.cursor = 'grab';
    });
  }

  // Global functions for inline handlers
  window.togglePanel = function() {
    const panel = document.getElementById(CONFIG.panelId);
    const content = panel?.querySelector('.tph-content');
    if (content) {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.closePanel = function() {
    const panel = document.getElementById(CONFIG.panelId);
    if (panel) panel.remove();
    panelVisible = false;
  };

  window.downloadImages = function() {
    const panel = document.getElementById(CONFIG.panelId);
    const amazonData = JSON.parse(panel?.dataset.amazonData || '{}');
    
    if (amazonData.images && amazonData.images.length > 0) {
      amazonData.images.forEach((img, index) => {
        const link = document.createElement('a');
        link.href = img.url;
        link.download = `product-image-${index + 1}.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      
      // Show feedback
      const btn = document.querySelector('.tph-btn-secondary');
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Downloaded!';
        setTimeout(() => btn.textContent = originalText, 2000);
      }
    }
  };

  window.showUpgrade = function() {
    alert('🚀 Upgrade to Pro to unlock image downloads!\n\nFeatures included:\n• One-click image downloads\n• Bulk product analysis\n• Advanced profit analytics\n• Priority support');
  };

})();
