# AliSmart Finder - QA Checklist & Test Suite

## 1. Test Categories Overview

| Category | Type | Coverage Target |
|----------|------|-----------------|
| Unit Tests | Jest | 80%+ |
| Integration Tests | Jest + Supertest | API endpoints |
| E2E Tests | Playwright | Critical flows |
| Manual QA | Checklist | UI/UX validation |

---

## 2. Unit Tests (Jest)

### 2.1 Product Matching Algorithm Tests

```javascript
// __tests__/matching/productMatcher.test.js
describe('Product Matching Algorithm', () => {
  
  describe('Text Similarity', () => {
    test('should return high similarity for identical titles', () => {
      const title1 = 'Razer DeathAdder V2 Gaming Mouse';
      const title2 = 'Razer DeathAdder V2 Gaming Mouse';
      expect(calculateSimilarity(title1, title2)).toBeGreaterThan(0.95);
    });
    
    test('should handle word order variations', () => {
      const amazon = 'Gaming Mouse Razer DeathAdder V2';
      const ali = 'Razer DeathAdder V2 Gaming Mouse';
      expect(calculateSimilarity(amazon, ali)).toBeGreaterThan(0.80);
    });
    
    test('should detect spec differences (RAM, storage)', () => {
      const amazon = 'MacBook Pro 16GB RAM 512GB SSD';
      const ali = 'MacBook Pro 8GB RAM 256GB SSD';
      const result = calculateMatchScore(amazon, ali);
      expect(result.specMatch).toBeLessThan(0.5);
    });
    
    test('should reject kitchen appliances', () => {
      const title = 'Rice Cooker 5 Cup Non-Stick';
      expect(isGamingTechProduct(title)).toBe(false);
    });
    
    test('should accept gaming peripherals', () => {
      const title = 'Logitech G Pro X Gaming Headset';
      expect(isGamingTechProduct(title)).toBe(true);
    });
  });

  describe('Price Validation', () => {
    test('should flag suspiciously low prices', () => {
      const amazon = 79.99;
      const ali = 12.99;  // 84% discount - suspicious
      expect(validatePriceRatio(amazon, ali)).toBeLessThan(0.5);
    });
    
    test('should accept reasonable discounts', () => {
      const amazon = 79.99;
      const ali = 45.99;  // 42% discount - reasonable
      expect(validatePriceRatio(amazon, ali)).toBeGreaterThan(0.7);
    });
  });
});
```

### 2.2 Price Parser Tests

```javascript
// __tests__/parsers/priceParser.test.js
describe('Price Parser', () => {
  const testCases = [
    { input: '$79.99', expected: 79.99 },
    { input: '$1,299.99', expected: 1299.99 },
    { input: '€45.50', expected: 45.50 },
    { input: '¥5000', expected: 5000 },
    { input: '79.99 USD', expected: 79.99 },
    { input: 'Free', expected: 0 },
    { input: '', expected: 0 },
    { input: 'N/A', expected: 0 }
  ];
  
  testCases.forEach(({ input, expected }) => {
    test(`parses "${input}" as ${expected}`, () => {
      expect(parsePrice(input)).toBe(expected);
    });
  });
});
```

### 2.3 DOM Extraction Tests

```javascript
// __tests__/content/domExtractor.test.js
describe('Amazon DOM Extraction', () => {
  beforeEach(() => {
    // Mock DOM setup
    document.body.innerHTML = `
      <span id="productTitle">Razer DeathAdder V2 Pro</span>
      <span class="a-price">
        <span class="a-offscreen">$79.99</span>
      </span>
    `;
  });
  
  test('extracts product title', () => {
    const data = extractProductData();
    expect(data.title).toBe('Razer DeathAdder V2 Pro');
  });
  
  test('extracts product price', () => {
    const data = extractProductData();
    expect(data.price).toBe('$79.99');
  });
  
  test('handles missing elements gracefully', () => {
    document.body.innerHTML = '<div>Empty page</div>';
    const data = extractProductData();
    expect(data).toBeNull();
  });
});
```

---

## 3. Integration Tests

### 3.1 API Endpoint Tests

```javascript
// __tests__/api/search.test.js
const request = require('supertest');
const app = require('../../backend/src/app');

describe('POST /api/search', () => {
  test('returns valid product matches', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({
        query: 'Razer DeathAdder V2',
        amazonPrice: 79.99
      })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.matches).toBeInstanceOf(Array);
    expect(response.body.data.matches[0]).toHaveProperty('price');
    expect(response.body.data.matches[0]).toHaveProperty('totalCost');
  });
  
  test('respects rate limiting', async () => {
    // Make 35 requests rapidly
    const requests = Array(35).fill().map(() => 
      request(app).post('/api/search').send({ query: 'test' })
    );
    
    const responses = await Promise.all(requests);
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);  // Too Many Requests
  });
  
  test('handles empty search results', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'xyznonexistentproduct12345' })
      .expect(200);
    
    expect(response.body.data.matches).toHaveLength(0);
  });
});
```

### 3.2 Database Tests

```javascript
// __tests__/db/priceHistory.test.js
describe('Price History Database', () => {
  test('stores and retrieves price history', async () => {
    const productId = 'test-product-123';
    
    await db.priceHistory.create({
      productId,
      source: 'aliexpress',
      price: 45.99,
      totalCost: 54.48
    });
    
    const history = await db.priceHistory.getByProduct(productId);
    expect(history).toHaveLength(1);
    expect(history[0].price).toBe(45.99);
  });
  
  test('calculates lowest price correctly', async () => {
    const productId = 'test-product-456';
    
    await Promise.all([
      db.priceHistory.create({ productId, price: 50.00 }),
      db.priceHistory.create({ productId, price: 45.00 }),
      db.priceHistory.create({ productId, price: 48.00 })
    ]);
    
    const lowest = await db.priceHistory.getLowest(productId);
    expect(lowest.price).toBe(45.00);
  });
});
```

---

## 4. E2E Tests (Playwright)

### 4.1 Extension Flow Tests

```javascript
// e2e/extension.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Extension E2E Tests', () => {
  
  test('detects gaming product and shows sidebar', async ({ page }) => {
    // Navigate to Amazon gaming product
    await page.goto('https://amazon.com/dp/B07Y1YQ1X7');
    
    // Wait for extension to inject
    await page.waitForSelector('#wc-price-hunter-card', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // Verify sidebar content
    const sidebar = await page.locator('#wc-price-hunter-card');
    await expect(sidebar).toContainText('AliExpress');
    await expect(sidebar).toContainText('$');
  });
  
  test('does not show for blocked categories', async ({ page }) => {
    await page.goto('https://amazon.com/dp/B08XYZRICE');  // Rice cooker
    
    // Wait a bit
    await page.waitForTimeout(3000);
    
    // Verify sidebar NOT present
    const sidebar = await page.locator('#wc-price-hunter-card');
    await expect(sidebar).not.toBeVisible();
  });
  
  test('calculates savings correctly', async ({ page }) => {
    await page.goto('https://amazon.com/dp/B07Y1YQ1X7');
    await page.waitForSelector('#wc-price-hunter-card');
    
    // Extract displayed prices
    const amazonPrice = await page.locator('.wc-price-amazon').textContent();
    const aliPrice = await page.locator('.wc-price-ali').textContent();
    
    // Parse and verify calculation
    const amazon = parseFloat(amazonPrice.replace('$', ''));
    const ali = parseFloat(aliPrice.replace('$', ''));
    
    expect(amazon).toBeGreaterThan(ali);  // Ali should be cheaper
  });
  
  test('close button works', async ({ page }) => {
    await page.goto('https://amazon.com/dp/B07Y1YQ1X7');
    await page.waitForSelector('#wc-price-hunter-card');
    
    // Click close
    await page.click('.wc-close-btn');
    
    // Verify removed
    const sidebar = await page.locator('#wc-price-hunter-card');
    await expect(sidebar).not.toBeVisible();
  });
});
```

---

## 5. Manual QA Checklist

### 5.1 Functionality Testing

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1 | Extension Installation | Load unpacked extension in Chrome | Extension appears in toolbar, no console errors | ⬜ |
| 2 | Amazon Page Detection | Navigate to gaming mouse product page | Sidebar appears within 3 seconds | ⬜ |
| 3 | Product Matching | Check displayed AliExpress product | Title similarity >80%, correct specs shown | ⬜ |
| 4 | Price Display | View price comparison | Both prices visible, savings calculated correctly | ⬜ |
| 5 | Shipping Estimates | View expanded product details | Shipping cost and time displayed | ⬜ |
| 6 | Buy Button | Click "Buy on AliExpress" | Opens AliExpress in new tab with correct product | ⬜ |
| 7 | Close Sidebar | Click X button | Sidebar closes smoothly | ⬜ |
| 8 | Reopen Sidebar | Refresh page | Sidebar reappears automatically | ⬜ |
| 9 | Category Blocking | Navigate to rice cooker page | Sidebar does NOT appear | ⬜ |
| 10 | Multiple Products | Navigate between 3 different products | Each shows correct matched product | ⬜ |

### 5.2 UI/UX Testing

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 11 | Glass Morphism | View sidebar on different backgrounds | `backdrop-filter: blur(15px)` visible | ⬜ |
| 12 | Dark Theme | Check all UI elements | All elements visible, proper contrast ratios | ⬜ |
| 13 | Responsive Width | Resize browser window (desktop) | Sidebar width stays 380px, content scrollable | ⬜ |
| 14 | Scroll Behavior | Scroll Amazon page | Sidebar stays fixed right, doesn't jump | ⬜ |
| 15 | Loading State | Throttle network to Slow 3G | Loading spinner appears, then transitions to results | ⬜ |
| 16 | No Match State | Find product with no AliExpress match | "No Accurate Match" message shown gracefully | ⬜ |
| 17 | Error State | Disconnect internet | Error message with retry option | ⬜ |
| 18 | Hover Effects | Hover over buy button | Neon glow effect, smooth transition | ⬜ |
| 19 | Focus States | Tab through interactive elements | Clear focus indicators visible | ⬜ |
| 20 | RTL Support | Check Hebrew text alignment | Proper RTL layout (for future localization) | ⬜ |

### 5.3 Performance Testing

| # | Test Case | Tool/Method | Target | Status |
|---|-----------|-------------|--------|--------|
| 21 | API Response Time | Chrome DevTools Network | <500ms p95 | ⬜ |
| 22 | Sidebar Paint Time | Chrome DevTools Performance | <50ms | ⬜ |
| 23 | Memory Usage | Chrome Task Manager | <100MB increase | ⬜ |
| 24 | CPU Usage | Chrome DevTools | <10% during search | ⬜ |
| 25 | Extension Load | Performance.mark | <100ms injection | ⬜ |

### 5.4 Security Testing

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 26 | HTTPS Only | Check all API calls | All use https:// (except local dev) | ⬜ |
| 27 | No Sensitive Data | Check localStorage | No PII stored unencrypted | ⬜ |
| 28 | CSP Compliance | Check manifest | Content Security Policy defined | ⬜ |
| 29 | Permission Scope | Review manifest permissions | Minimal permissions requested | ⬜ |
| 30 | XSS Prevention | Try injecting script in product title | Scripts sanitized/escaped | ⬜ |

---

## 6. Edge Cases & Regression Tests

```javascript
// __tests__/edge-cases.test.js
describe('Edge Cases', () => {
  
  test('handles extremely long titles (>200 chars)', () => {
    const longTitle = 'Gaming Mouse '.repeat(20);
    const result = extractProductData({ title: longTitle });
    expect(result.title).toHaveLength.lessThan(250);
  });
  
  test('handles special characters in titles', () => {
    const title = 'Razer™ DeathAdder® V2 (Gaming) [RGB] {2024}';
    const normalized = normalizeTitle(title);
    expect(normalized).not.toContain('™');
    expect(normalized).not.toContain('®');
  });
  
  test('handles dynamic Amazon price changes', async () => {
    // Simulate price change while sidebar is open
    await page.evaluate(() => {
      document.querySelector('.a-price .a-offscreen').textContent = '$69.99';
    });
    
    // Verify sidebar updates
    await page.waitForTimeout(500);
    const price = await page.locator('.wc-price-amazon').textContent();
    expect(price).toContain('69.99');
  });
  
  test('handles AliExpress search timeout', async () => {
    // Mock 10s delay
    jest.useFakeTimers();
    const result = await searchAliExpress('test', { timeout: 5000 });
    expect(result).toBeNull();
  });
  
  test('handles concurrent page navigations', async () => {
    // Rapid navigation between products
    for (const asin of ['B07Y1YQ1X7', 'B08XYZ1234', 'B09ABC5678']) {
      await page.goto(`https://amazon.com/dp/${asin}`);
      await page.waitForTimeout(500);
    }
    
    // Should not have multiple sidebars
    const sidebars = await page.locator('#wc-price-hunter-card').count();
    expect(sidebars).toBe(1);
  });
});
```

---

## 7. Test Execution Schedule

| Phase | Unit Tests | Integration | E2E | Manual QA |
|-------|------------|-------------|-----|-----------|
| MVP | Daily | Every 2 days | Pre-release | Pre-release |
| V1 | Every commit | Daily | Weekly | Per sprint |
| V2 | Every commit | Every commit | Daily | Per feature |

---

## 8. Bug Severity Classification

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| P0 (Critical) | Extension crashes, data loss | Immediate | Memory leak, API down |
| P1 (High) | Major feature broken | 24 hours | Matching fails, prices wrong |
| P2 (Medium) | Feature partially working | 1 week | UI glitches, slow loading |
| P3 (Low) | Cosmetic issues | Next release | Typos, minor styling |

---

*Document Version: 1.0*
*Last Updated: 2026-02-26*
