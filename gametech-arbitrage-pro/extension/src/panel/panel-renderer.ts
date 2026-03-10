/**
 * Panel Renderer - Glass-morphism UI with Neon Blue accents
 * [cite: 2026-01-25] - Premium UI requirements
 */

export interface PanelData {
  asin: string;
  amazonProduct: {
    title: string;
    price: number;
    image: string;
    category?: string;
  };
  aliExpress: {
    title: string;
    price: number;
    originalPrice: number;
    productUrl: string;
    image: string;
    rating: number;
    orders: number;
    discount: number;
    shippingEstimate: number;
  };
  profit: {
    profit: number;
    profitMargin: number;
    profitScore: number;
    breakdown: {
      amazonPrice: number;
      aliPrice: number;
      amazonFees: number;
      shipping: number;
      netProfit: number;
    };
    recommendation: string;
  } | null;
  niche: {
    category: string;
    confidence: number;
  };
  onDownloadImages: () => void;
  onClose: () => void;
}

export class PanelRenderer {
  private panelId: string;
  private panel: HTMLElement | null = null;
  private isCollapsed = false;

  constructor(panelId: string) {
    this.panelId = panelId;
    this.loadCollapsedState();
  }

  /**
   * Show loading state
   */
  showLoading(category: string): void {
    this.injectStyles();
    
    const html = `
      <div class="gta-panel-header">
        <div class="gta-panel-title">
          <span class="gta-icon">🎮</span>
          GameTech Arbitrage
        </div>
        <div class="gta-panel-controls">
          <button class="gta-btn gta-btn-icon" id="gta-collapse" title="Collapse">−</button>
          <button class="gta-btn gta-btn-icon" id="gta-close" title="Close">×</button>
        </div>
      </div>
      <div class="gta-panel-content">
        <div class="gta-loading">
          <div class="gta-spinner"></div>
          <p class="gta-loading-text">Analyzing ${category}...</p>
          <p class="gta-loading-subtext">Searching AliExpress for better prices</p>
        </div>
      </div>
    `;
    
    this.showPanel(html);
    this.attachEventListeners();
  }

  /**
   * Show results panel
   */
  showResults(data: PanelData): void {
    const profit = data.profit;
    const isProfitable = profit && profit.profit > 0;
    const scoreColor = this.getScoreColor(profit?.profitScore || 0);
    
    const html = `
      <div class="gta-panel-header">
        <div class="gta-panel-title">
          <span class="gta-icon">🎮</span>
          GameTech Arbitrage
        </div>
        <div class="gta-panel-controls">
          <button class="gta-btn gta-btn-icon" id="gta-collapse" title="Collapse">${this.isCollapsed ? '+' : '−'}</button>
          <button class="gta-btn gta-btn-icon" id="gta-close" title="Close">×</button>
        </div>
      </div>
      
      <div class="gta-panel-content ${this.isCollapsed ? 'gta-collapsed' : ''}">
        <!-- ASIN Display -->
        <div class="gta-asin-bar">
          <span class="gta-asin-label">ASIN:</span>
          <code class="gta-asin-code">${data.asin}</code>
          <button class="gta-btn gta-btn-copy" id="gta-copy-asin" title="Copy ASIN">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        
        <!-- Category Badge -->
        <div class="gta-category-badge">
          <span class="gta-category-icon">${this.getCategoryIcon(data.niche.category)}</span>
          ${data.niche.category}
          <span class="gta-confidence">(${Math.round(data.niche.confidence * 100)}% match)</span>
        </div>
        
        ${profit ? `
        <!-- Profit Score Card -->
        <div class="gta-score-card" style="--score-color: ${scoreColor}">
          <div class="gta-score-circle">
            <span class="gta-score-number">${profit.profitScore}</span>
            <span class="gta-score-label">Score</span>
          </div>
          <div class="gta-profit-info">
            <div class="gta-profit-amount">$${profit.profit.toFixed(2)}</div>
            <div class="gta-profit-margin">${profit.profitMargin}% margin</div>
            <div class="gta-recommendation gta-rec-${profit.recommendation}">
              ${this.getRecommendationText(profit.recommendation)}
            </div>
          </div>
        </div>
        
        <!-- Price Breakdown -->
        <div class="gta-breakdown">
          <div class="gta-breakdown-title">💰 Profit Breakdown</div>
          <div class="gta-breakdown-row">
            <span>Amazon Price</span>
            <span class="gta-price-amazon">$${profit.breakdown.amazonPrice.toFixed(2)}</span>
          </div>
          <div class="gta-breakdown-row gta-negative">
            <span>AliExpress Cost</span>
            <span>−$${profit.breakdown.aliPrice.toFixed(2)}</span>
          </div>
          <div class="gta-breakdown-row gta-negative">
            <span>Amazon Fees (15%)</span>
            <span>−$${profit.breakdown.amazonFees.toFixed(2)}</span>
          </div>
          <div class="gta-breakdown-row gta-negative">
            <span>Shipping Estimate</span>
            <span>−$${profit.breakdown.shipping.toFixed(2)}</span>
          </div>
          <div class="gta-breakdown-row gta-total">
            <span>Net Profit</span>
            <span class="gta-profit-value" style="color: ${scoreColor}">$${profit.breakdown.netProfit.toFixed(2)}</span>
          </div>
        </div>
        ` : '<div class="gta-no-profit">Unable to calculate profit</div>'}
        
        <!-- AliExpress Match -->
        <div class="gta-ali-match">
          <div class="gta-ali-title">📦 AliExpress Match</div>
          <div class="gta-ali-product">
            <img src="${data.aliExpress.image}" alt="AliExpress Product" class="gta-ali-img" onerror="this.style.display='none'">
            <div class="gta-ali-info">
              <div class="gta-ali-name">${data.aliExpress.title.substring(0, 60)}${data.aliExpress.title.length > 60 ? '...' : ''}</div>
              <div class="gta-ali-meta">
                <span class="gta-ali-price">$${data.aliExpress.price.toFixed(2)}</span>
                ${data.aliExpress.originalPrice > data.aliExpress.price ? `<span class="gta-ali-original">$${data.aliExpress.originalPrice.toFixed(2)}</span>` : ''}
                <span class="gta-ali-rating">⭐ ${data.aliExpress.rating.toFixed(1)}</span>
                <span class="gta-ali-orders">📦 ${data.aliExpress.orders} sold</span>
              </div>
              ${data.aliExpress.discount > 0 ? `<span class="gta-discount-badge">−${data.aliExpress.discount}%</span>` : ''}
            </div>
          </div>
          <a href="${data.aliExpress.productUrl}" target="_blank" class="gta-btn gta-btn-primary gta-btn-full">
            🛒 View on AliExpress
          </a>
        </div>
        
        <!-- Actions -->
        <div class="gta-actions">
          <button class="gta-btn gta-btn-secondary gta-btn-full" id="gta-download-images">
            📸 Download All Images
          </button>
        </div>
        
        <!-- Footer -->
        <div class="gta-panel-footer">
          <span class="gta-footer-text">GameTech Arbitrage Pro v1.0</span>
        </div>
      </div>
    `;
    
    this.showPanel(html);
    this.attachEventListeners(data);
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    const html = `
      <div class="gta-panel-header">
        <div class="gta-panel-title">
          <span class="gta-icon">🎮</span>
          GameTech Arbitrage
        </div>
        <div class="gta-panel-controls">
          <button class="gta-btn gta-btn-icon" id="gta-close">×</button>
        </div>
      </div>
      <div class="gta-panel-content">
        <div class="gta-error">
          <div class="gta-error-icon">⚠️</div>
          <p class="gta-error-text">${message}</p>
          <button class="gta-btn gta-btn-secondary" id="gta-retry">Retry</button>
        </div>
      </div>
    `;
    
    this.showPanel(html);
    this.attachEventListeners();
  }

  /**
   * Show image download progress
   */
  showImageDownloadProgress(progress: number): void {
    // Implementation for showing download progress
    console.log('[Panel] Download progress:', progress);
  }

  /**
   * Hide image download progress
   */
  hideImageDownloadProgress(): void {
    // Implementation
  }

  /**
   * Show image download error
   */
  showImageDownloadError(error: string): void {
    console.error('[Panel] Download error:', error);
  }

  /**
   * Hide panel
   */
  hide(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  /**
   * Get score color based on score value
   */
  private getScoreColor(score: number): string {
    if (score >= 8) return '#00ff88'; // Neon green
    if (score >= 5) return '#00bfff'; // Neon blue
    if (score >= 3) return '#ffaa00'; // Orange
    return '#ff4444'; // Red
  }

  /**
   * Get category icon
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      keyboard: '⌨️',
      mouse: '🖱️',
      monitor: '🖥️',
      headphones: '🎧',
      microphone: '🎙️',
      webcam: '📷',
      controller: '🎮',
      'studio-gear': '🎚️',
      'pc-parts': '💻',
      accessories: '🔌',
    };
    return icons[category] || '📦';
  }

  /**
   * Get recommendation text
   */
  private getRecommendationText(rec: string): string {
    const texts: Record<string, string> = {
      high: '🔥 Excellent Opportunity',
      medium: '✅ Good Opportunity',
      low: '⚠️ Marginal',
      avoid: '❌ Not Recommended',
    };
    return texts[rec] || 'Unknown';
  }

  /**
   * Show panel with HTML content
   */
  private showPanel(html: string): void {
    this.hide();
    
    this.panel = document.createElement('div');
    this.panel.id = this.panelId;
    this.panel.className = 'gametech-arbitrage-panel';
    this.panel.innerHTML = html;
    
    document.body.appendChild(this.panel);
    
    // Make draggable
    this.makeDraggable();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(data?: PanelData): void {
    if (!this.panel) return;
    
    // Close button
    const closeBtn = this.panel.querySelector('#gta-close');
    closeBtn?.addEventListener('click', () => {
      this.hide();
      data?.onClose();
    });
    
    // Collapse button
    const collapseBtn = this.panel.querySelector('#gta-collapse');
    collapseBtn?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      const content = this.panel?.querySelector('.gta-panel-content');
      if (content) {
        content.classList.toggle('gta-collapsed', this.isCollapsed);
      }
      this.saveCollapsedState();
    });
    
    // Copy ASIN button
    const copyBtn = this.panel.querySelector('#gta-copy-asin');
    copyBtn?.addEventListener('click', () => {
      if (data?.asin) {
        navigator.clipboard.writeText(data.asin);
        copyBtn.textContent = '✓';
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1500);
      }
    });
    
    // Download images button
    const downloadBtn = this.panel?.querySelector('#gta-download-images');
    downloadBtn?.addEventListener('click', () => {
      data?.onDownloadImages();
    });
    
    // Retry button
    const retryBtn = this.panel?.querySelector('#gta-retry');
    retryBtn?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  /**
   * Make panel draggable
   */
  private makeDraggable(): void {
    if (!this.panel) return;
    
    const header = this.panel.querySelector('.gta-panel-header');
    if (!header) return;
    
    let isDragging = false;
    let startX: number, startY: number, initialX: number, initialY: number;
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = this.panel!.offsetLeft;
      initialY = this.panel!.offsetTop;
      header.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.panel) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      const newX = Math.max(0, Math.min(window.innerWidth - this.panel.offsetWidth, initialX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - this.panel.offsetHeight, initialY + dy));
      
      this.panel.style.left = `${newX}px`;
      this.panel.style.top = `${newY}px`;
      this.panel.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      header.style.cursor = 'grab';
    });
  }

  /**
   * Inject panel styles
   */
  private injectStyles(): void {
    if (document.getElementById('gametech-panel-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'gametech-panel-styles';
    styles.textContent = `
      /* Glass-morphism Panel Styles with Neon Blue accents */
      .gametech-arbitrage-panel {
        position: fixed;
        top: 100px;
        right: 20px;
        width: 380px;
        max-height: calc(100vh - 120px);
        background: rgba(20, 20, 35, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 191, 255, 0.3);
        border-radius: 16px;
        box-shadow: 
          0 20px 60px rgba(0, 0, 0, 0.5),
          0 0 40px rgba(0, 191, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #e8e8e8;
        overflow: hidden;
        transition: transform 0.3s ease, opacity 0.3s ease;
        animation: gta-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      @keyframes gta-slide-in {
        from {
          transform: translateX(420px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .gta-panel-header {
        background: linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(138, 43, 226, 0.2) 100%);
        padding: 16px 20px;
        border-bottom: 1px solid rgba(0, 191, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
        user-select: none;
      }
      
      .gta-panel-title {
        font-size: 16px;
        font-weight: 700;
        color: #00bfff;
        text-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .gta-icon {
        font-size: 20px;
        filter: drop-shadow(0 0 5px rgba(0, 191, 255, 0.8));
      }
      
      .gta-panel-controls {
        display: flex;
        gap: 8px;
      }
      
      .gta-btn {
        background: rgba(0, 191, 255, 0.15);
        border: 1px solid rgba(0, 191, 255, 0.3);
        color: #00bfff;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      
      .gta-btn:hover {
        background: rgba(0, 191, 255, 0.3);
        box-shadow: 0 0 15px rgba(0, 191, 255, 0.4);
        transform: translateY(-1px);
      }
      
      .gta-btn:active {
        transform: translateY(0);
      }
      
      .gta-btn-icon {
        width: 32px;
        height: 32px;
        padding: 0;
        font-size: 18px;
        border-radius: 6px;
      }
      
      .gta-btn-primary {
        background: linear-gradient(135deg, rgba(0, 191, 255, 0.3) 0%, rgba(138, 43, 226, 0.3) 100%);
        border-color: rgba(0, 191, 255, 0.5);
        box-shadow: 0 4px 15px rgba(0, 191, 255, 0.3);
      }
      
      .gta-btn-primary:hover {
        box-shadow: 0 6px 25px rgba(0, 191, 255, 0.5);
      }
      
      .gta-btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
        color: #b0b0b0;
      }
      
      .gta-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
        color: #fff;
      }
      
      .gta-btn-full {
        width: 100%;
        padding: 12px;
        font-size: 15px;
      }
      
      .gta-btn-copy {
        width: 28px;
        height: 28px;
        padding: 4px;
        background: rgba(0, 191, 255, 0.1);
      }
      
      .gta-panel-content {
        padding: 20px;
        overflow-y: auto;
        max-height: calc(100vh - 200px);
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 191, 255, 0.3) transparent;
      }
      
      .gta-panel-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .gta-panel-content::-webkit-scrollbar-thumb {
        background: rgba(0, 191, 255, 0.3);
        border-radius: 3px;
      }
      
      .gta-collapsed {
        display: none;
      }
      
      /* ASIN Bar */
      .gta-asin-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        margin-bottom: 16px;
        font-size: 13px;
      }
      
      .gta-asin-label {
        color: #888;
        font-weight: 500;
      }
      
      .gta-asin-code {
        font-family: 'SF Mono', Monaco, monospace;
        color: #00bfff;
        background: rgba(0, 191, 255, 0.1);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        flex: 1;
      }
      
      /* Category Badge */
      .gta-category-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: rgba(0, 191, 255, 0.15);
        border: 1px solid rgba(0, 191, 255, 0.3);
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        color: #00bfff;
        margin-bottom: 16px;
        text-shadow: 0 0 5px rgba(0, 191, 255, 0.3);
      }
      
      .gta-confidence {
        color: #888;
        font-weight: 400;
        font-size: 12px;
      }
      
      /* Score Card */
      .gta-score-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: linear-gradient(135deg, rgba(0, 191, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%);
        border: 2px solid var(--score-color, #00bfff);
        border-radius: 16px;
        margin-bottom: 20px;
        box-shadow: 0 0 30px rgba(0, 191, 255, 0.15);
      }
      
      .gta-score-circle {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(0, 191, 255, 0.2) 0%, rgba(138, 43, 226, 0.2) 100%);
        border: 3px solid var(--score-color, #00bfff);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(0, 191, 255, 0.3);
      }
      
      .gta-score-number {
        font-size: 28px;
        font-weight: 800;
        color: var(--score-color, #00bfff);
        text-shadow: 0 0 10px var(--score-color, #00bfff);
        line-height: 1;
      }
      
      .gta-score-label {
        font-size: 11px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 2px;
      }
      
      .gta-profit-info {
        flex: 1;
      }
      
      .gta-profit-amount {
        font-size: 28px;
        font-weight: 700;
        color: var(--score-color, #00bfff);
        text-shadow: 0 0 10px rgba(0, 191, 255, 0.3);
        line-height: 1.2;
      }
      
      .gta-profit-margin {
        font-size: 14px;
        color: #888;
        margin-top: 2px;
      }
      
      .gta-recommendation {
        margin-top: 8px;
        font-size: 13px;
        font-weight: 600;
        padding: 6px 10px;
        border-radius: 6px;
        display: inline-block;
      }
      
      .gta-rec-high {
        background: rgba(0, 255, 136, 0.15);
        color: #00ff88;
        border: 1px solid rgba(0, 255, 136, 0.3);
      }
      
      .gta-rec-medium {
        background: rgba(0, 191, 255, 0.15);
        color: #00bfff;
        border: 1px solid rgba(0, 191, 255, 0.3);
      }
      
      .gta-rec-low {
        background: rgba(255, 170, 0, 0.15);
        color: #ffaa00;
        border: 1px solid rgba(255, 170, 0, 0.3);
      }
      
      .gta-rec-avoid {
        background: rgba(255, 68, 68, 0.15);
        color: #ff4444;
        border: 1px solid rgba(255, 68, 68, 0.3);
      }
      
      /* Breakdown */
      .gta-breakdown {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .gta-breakdown-title {
        font-size: 14px;
        font-weight: 700;
        color: #00bfff;
        margin-bottom: 14px;
        text-shadow: 0 0 5px rgba(0, 191, 255, 0.3);
      }
      
      .gta-breakdown-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        font-size: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .gta-breakdown-row:last-child {
        border-bottom: none;
      }
      
      .gta-breakdown-row span:first-child {
        color: #aaa;
      }
      
      .gta-breakdown-row span:last-child {
        font-weight: 600;
        font-family: 'SF Mono', monospace;
      }
      
      .gta-price-amazon {
        color: #ff6b6b;
      }
      
      .gta-negative span:last-child {
        color: #ff8888;
      }
      
      .gta-total {
        margin-top: 10px;
        padding-top: 14px;
        border-top: 2px solid rgba(0, 191, 255, 0.3);
        font-size: 16px;
        font-weight: 700;
      }
      
      .gta-profit-value {
        font-size: 20px;
        text-shadow: 0 0 10px currentColor;
      }
      
      /* AliExpress Match */
      .gta-ali-match {
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(238, 90, 36, 0.1) 100%);
        border: 1px solid rgba(255, 107, 107, 0.3);
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .gta-ali-title {
        font-size: 14px;
        font-weight: 700;
        color: #ff6b6b;
        margin-bottom: 12px;
        text-shadow: 0 0 5px rgba(255, 107, 107, 0.3);
      }
      
      .gta-ali-product {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
      }
      
      .gta-ali-img {
        width: 70px;
        height: 70px;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid rgba(255, 107, 107, 0.3);
        background: rgba(0, 0, 0, 0.3);
      }
      
      .gta-ali-info {
        flex: 1;
        min-width: 0;
      }
      
      .gta-ali-name {
        font-size: 13px;
        font-weight: 600;
        color: #e8e8e8;
        line-height: 1.4;
        margin-bottom: 8px;
      }
      
      .gta-ali-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 12px;
        align-items: center;
      }
      
      .gta-ali-price {
        font-size: 16px;
        font-weight: 700;
        color: #ff6b6b;
      }
      
      .gta-ali-original {
        text-decoration: line-through;
        color: #888;
        font-size: 12px;
      }
      
      .gta-ali-rating {
        color: #ffc107;
      }
      
      .gta-ali-orders {
        color: #888;
      }
      
      .gta-discount-badge {
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
      }
      
      /* Loading State */
      .gta-loading {
        text-align: center;
        padding: 40px 20px;
      }
      
      .gta-spinner {
        width: 50px;
        height: 50px;
        border: 3px solid rgba(0, 191, 255, 0.2);
        border-top-color: #00bfff;
        border-radius: 50%;
        animation: gta-spin 1s linear infinite;
        margin: 0 auto 20px;
        box-shadow: 0 0 15px rgba(0, 191, 255, 0.3);
      }
      
      @keyframes gta-spin {
        to {
          transform: rotate(360deg);
        }
      }
      
      .gta-loading-text {
        font-size: 16px;
        font-weight: 600;
        color: #00bfff;
        margin-bottom: 8px;
        text-shadow: 0 0 10px rgba(0, 191, 255, 0.3);
      }
      
      .gta-loading-subtext {
        font-size: 13px;
        color: #888;
      }
      
      /* Error State */
      .gta-error {
        text-align: center;
        padding: 40px 20px;
      }
      
      .gta-error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .gta-error-text {
        font-size: 14px;
        color: #ff8888;
        margin-bottom: 20px;
      }
      
      /* Footer */
      .gta-panel-footer {
        text-align: center;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: 16px;
      }
      
      .gta-footer-text {
        font-size: 11px;
        color: #666;
      }
      
      /* Keyboard shortcut hint */
      .gta-keyboard-hint {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 191, 255, 0.15);
        border: 1px solid rgba(0, 191, 255, 0.3);
        color: #00bfff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 2147483646;
        backdrop-filter: blur(10px);
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .gametech-arbitrage-panel {
          width: calc(100vw - 40px);
          right: 20px;
          left: 20px;
          top: 80px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Load collapsed state from storage
   */
  private loadCollapsedState(): void {
    chrome.storage.sync.get(['panelCollapsed'], (result) => {
      this.isCollapsed = result.panelCollapsed || false;
    });
  }

  /**
   * Save collapsed state
   */
  private saveCollapsedState(): void {
    chrome.storage.sync.set({ panelCollapsed: this.isCollapsed });
  }
}
