/**
 * Smart Panel UI Component
 * Renders floating panel with product comparison using Shadow DOM
 */

class SmartPanel {
  constructor() {
    this.container = null;
    this.shadowRoot = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  /**
   * Create and inject panel into page
   */
  create(data, type = 'amazon') {
    // Remove existing panel
    this.remove();

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'wc-price-hunter-panel';
    this.container.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Attach Shadow DOM to prevent CSS conflicts
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Render content based on type
    if (type === 'amazon') {
      this.renderAmazonPanel(data);
    } else if (type === 'aliexpress') {
      this.renderAliExpressPanel(data);
    }

    // Add to page
    document.body.appendChild(this.container);

    // Make draggable
    this.makeDraggable();

    // Animate entry
    setTimeout(() => {
      const panel = this.shadowRoot.querySelector('.panel');
      if (panel) panel.classList.add('show');
    }, 100);
  }

  /**
   * Render Amazon → AliExpress comparison panel
   */
  renderAmazonPanel(data) {
    const { matched, bestDeal, confidence, alternatives } = data;

    if (!matched || !bestDeal) {
      this.renderNoBetterDeal();
      return;
    }

    const savings = bestDeal.savingsAmount || 0;
    const savingsPercent = bestDeal.savingsPercent || 0;

    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      <div class="panel">
        <div class="header">
          <div class="title">💰 Better Price Found!</div>
          <button class="close-btn" onclick="this.getRootNode().host.remove()">✕</button>
        </div>

        <div class="body">
          <!-- Savings Badge -->
          <div class="savings-badge">
            <div class="savings-label">You Save</div>
            <div class="savings-amount">$${savings.toFixed(2)}</div>
            <div class="savings-percent">${savingsPercent}% OFF</div>
            <div class="confidence">Match: ${(confidence * 100).toFixed(0)}%</div>
          </div>

          <!-- Product Info -->
          <div class="product-card">
            <img src="${bestDeal.image}" class="product-image" alt="Product">
            <div class="product-details">
              <div class="product-title">${this.truncate(bestDeal.title, 60)}</div>
              <div class="product-meta">
                <span>⭐ ${bestDeal.rating}</span>
                <span>📦 ${bestDeal.orders} sold</span>
                ${bestDeal.discount > 0 ? `<span class="discount">-${bestDeal.discount}%</span>` : ''}
              </div>
              <div class="price-row">
                <span class="price-label">Price:</span>
                <span class="price-value">$${bestDeal.salePrice.toFixed(2)}</span>
              </div>
              ${bestDeal.shippingCost > 0 ? `
                <div class="price-row">
                  <span class="price-label">Shipping:</span>
                  <span class="price-value">$${bestDeal.shippingCost.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="price-row total">
                <span class="price-label">Total:</span>
                <span class="price-value">$${bestDeal.totalPrice.toFixed(2)}</span>
              </div>
              <div class="delivery">🚚 ${bestDeal.deliveryDays} days delivery</div>
            </div>
          </div>

          <!-- Action Button -->
          <a href="${bestDeal.affiliateUrl}" target="_blank" class="buy-button">
            🛒 View on AliExpress
          </a>

          <!-- Alternatives -->
          ${alternatives && alternatives.length > 0 ? `
            <details class="alternatives">
              <summary>See ${alternatives.length} More Option${alternatives.length > 1 ? 's' : ''}</summary>
              <div class="alternatives-list">
                ${alternatives.slice(0, 5).map(alt => `
                  <div class="alt-item">
                    <img src="${alt.image}" class="alt-image">
                    <div class="alt-info">
                      <div class="alt-title">${this.truncate(alt.title, 40)}</div>
                      <div class="alt-price">$${alt.totalPrice.toFixed(2)}</div>
                    </div>
                    <a href="${alt.affiliateUrl}" target="_blank" class="alt-link">View</a>
                  </div>
                `).join('')}
              </div>
            </details>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render AliExpress cheaper alternatives panel
   */
  renderAliExpressPanel(data) {
    const { hasCheaper, cheapest, savings, savingsPercent, alternatives, currentPrice } = data;

    if (!hasCheaper) {
      this.renderBestPriceBadge(currentPrice);
      return;
    }

    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      <div class="panel">
        <div class="header">
          <div class="title">💡 Cheaper Option Found!</div>
          <button class="close-btn" onclick="this.getRootNode().host.remove()">✕</button>
        </div>

        <div class="body">
          <!-- Savings Badge -->
          <div class="savings-badge ali">
            <div class="savings-label">Save on Same Product</div>
            <div class="savings-amount">$${savings.toFixed(2)}</div>
            <div class="savings-percent">${savingsPercent}% Cheaper</div>
          </div>

          <!-- Current vs Cheaper -->
          <div class="comparison">
            <div class="comp-row">
              <span class="comp-label">Current Listing:</span>
              <span class="comp-price old">$${currentPrice.toFixed(2)}</span>
            </div>
            <div class="comp-row">
              <span class="comp-label">Better Deal:</span>
              <span class="comp-price new">$${cheapest.totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <!-- Cheaper Product -->
          <div class="product-card">
            <img src="${cheapest.image}" class="product-image" alt="Product">
            <div class="product-details">
              <div class="product-title">${this.truncate(cheapest.title, 60)}</div>
              <div class="product-meta">
                <span>⭐ ${cheapest.rating}</span>
                <span>📦 ${cheapest.orders} sold</span>
              </div>
              <div class="seller-info">
                <span>👤 ${cheapest.seller.name}</span>
                <span>⭐ ${cheapest.seller.rating}</span>
              </div>
            </div>
          </div>

          <!-- Action Button -->
          <a href="${cheapest.affiliateUrl}" target="_blank" class="buy-button">
            🛒 Switch to This Listing
          </a>

          <!-- More Alternatives -->
          ${alternatives && alternatives.length > 0 ? `
            <details class="alternatives">
              <summary>${alternatives.length} More Cheaper Option${alternatives.length > 1 ? 's' : ''}</summary>
              <div class="alternatives-list">
                ${alternatives.map(alt => `
                  <div class="alt-item">
                    <img src="${alt.image}" class="alt-image">
                    <div class="alt-info">
                      <div class="alt-title">${this.truncate(alt.title, 40)}</div>
                      <div class="alt-price">$${alt.totalPrice.toFixed(2)}</div>
                      <div class="alt-save">Save $${(currentPrice - alt.totalPrice).toFixed(2)}</div>
                    </div>
                    <a href="${alt.affiliateUrl}" target="_blank" class="alt-link">View</a>
                  </div>
                `).join('')}
              </div>
            </details>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render "no better deal" message
   */
  renderNoBetterDeal() {
    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      <div class="panel small">
        <div class="header">
          <div class="title">✅ Best Price!</div>
          <button class="close-btn" onclick="this.getRootNode().host.remove()">✕</button>
        </div>
        <div class="body">
          <div class="message">
            <div class="message-icon">🎯</div>
            <div class="message-text">This is already the best price we found!</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render minimal "best price" badge
   */
  renderBestPriceBadge(currentPrice) {
    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      <div class="badge">
        <div class="badge-content">
          <span class="badge-icon">✅</span>
          <span class="badge-text">Best Price: $${currentPrice.toFixed(2)}</span>
        </div>
        <button class="badge-close" onclick="this.getRootNode().host.remove()">✕</button>
      </div>
    `;
  }

  /**
   * Get component styles
   */
  getStyles() {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .panel {
          width: 380px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          transform: translateX(420px);
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .panel.show {
          transform: translateX(0);
          opacity: 1;
        }

        .panel.small {
          width: 300px;
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
          user-select: none;
        }

        .title {
          font-size: 16px;
          font-weight: 700;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .body {
          padding: 20px;
        }

        .savings-badge {
          background: linear-gradient(135deg, #27ae60, #2ecc71);
          color: white;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 16px;
        }

        .savings-badge.ali {
          background: linear-gradient(135deg, #3498db, #2980b9);
        }

        .savings-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .savings-amount {
          font-size: 28px;
          font-weight: 800;
          margin: 4px 0;
        }

        .savings-percent {
          font-size: 14px;
          font-weight: 600;
        }

        .confidence {
          font-size: 11px;
          opacity: 0.8;
          margin-top: 4px;
        }

        .product-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        .product-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid #e9ecef;
        }

        .product-details {
          flex: 1;
        }

        .product-title {
          font-size: 13px;
          font-weight: 500;
          color: #212529;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .product-meta {
          display: flex;
          gap: 10px;
          font-size: 11px;
          color: #6c757d;
          margin-bottom: 8px;
        }

        .discount {
          background: #ff6b6b;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .price-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .price-row.total {
          font-weight: 700;
          font-size: 14px;
          color: #27ae60;
          padding-top: 4px;
          border-top: 1px solid #dee2e6;
        }

        .delivery {
          font-size: 11px;
          color: #6c757d;
          margin-top: 4px;
        }

        .seller-info {
          display: flex;
          gap: 10px;
          font-size: 11px;
          color: #6c757d;
          margin-top: 8px;
        }

        .comparison {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        .comp-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .comp-price.old {
          color: #e74c3c;
          text-decoration: line-through;
        }

        .comp-price.new {
          color: #27ae60;
          font-weight: 700;
        }

        .buy-button {
          display: block;
          width: 100%;
          background: linear-gradient(135deg, #ff6b6b, #ee5a24);
          color: white;
          text-align: center;
          padding: 14px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          transition: all 0.3s;
          margin-bottom: 16px;
        }

        .buy-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(238, 90, 36, 0.4);
        }

        .alternatives {
          margin-top: 16px;
        }

        .alternatives summary {
          cursor: pointer;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #495057;
        }

        .alternatives-list {
          margin-top: 12px;
        }

        .alt-item {
          display: flex;
          gap: 10px;
          padding: 10px;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          margin-bottom: 8px;
          align-items: center;
        }

        .alt-image {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 6px;
        }

        .alt-info {
          flex: 1;
        }

        .alt-title {
          font-size: 12px;
          color: #212529;
          margin-bottom: 4px;
        }

        .alt-price {
          font-size: 13px;
          font-weight: 700;
          color: #27ae60;
        }

        .alt-save {
          font-size: 11px;
          color: #6c757d;
        }

        .alt-link {
          background: #667eea;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }

        .message {
          text-align: center;
          padding: 20px;
        }

        .message-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .message-text {
          font-size: 14px;
          color: #495057;
        }

        .badge {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .badge-icon {
          font-size: 20px;
        }

        .badge-text {
          font-size: 14px;
          font-weight: 600;
          color: #27ae60;
        }

        .badge-close {
          background: #f8f9fa;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          color: #6c757d;
        }

        @media (max-width: 768px) {
          .panel {
            width: calc(100vw - 40px);
            right: 20px;
          }
        }
      </style>
    `;
  }

  /**
   * Make panel draggable
   */
  makeDraggable() {
    const header = this.shadowRoot.querySelector('.header');
    if (!header) return;

    header.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.container.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;

      const maxX = window.innerWidth - this.container.offsetWidth;
      const maxY = window.innerHeight - this.container.offsetHeight;

      this.container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
      this.container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
      this.container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        const header = this.shadowRoot.querySelector('.header');
        if (header) header.style.cursor = 'move';
      }
    });
  }

  /**
   * Remove panel from page
   */
  remove() {
    if (this.container && this.container.parentNode) {
      this.container.remove();
    }
    this.container = null;
    this.shadowRoot = null;
  }

  /**
   * Truncate text
   */
  truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

// Export singleton
const smartPanel = new SmartPanel();
