# AliSmart Finder - Technical Specifications

## 1. System Architecture

### 1.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER EXTENSION                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Content     │  │ Background  │  │ Popup UI (Vue.js)   │  │
│  │ Script      │◄─┤ Script      │  │                     │  │
│  │ (Injection) │  │ (API/Cache) │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
│         │                │                                   │
│         └────────────────┘                                   │
│                   │                                          │
│                   ▼                                          │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API (Node.js)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Express     │  │ Redis       │  │ PostgreSQL          │  │
│  │ Routes      │  │ Cache       │  │ (Price History)     │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           AliExpress Scraper Service                    ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   ││
│  │  │ Puppeteer│ │ Proxy    │ │ Price    │ │ Product  │   ││
│  │  │ Scraper  │ │ Rotation │ │ Parser   │ │ Matcher  │   ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Content Script | Vanilla JS | DOM injection, Amazon detection, sidebar rendering |
| Background Script | WebExtensions API | API calls, caching, cross-tab communication |
| Popup UI | Vue 3 + Vite | Settings, wishlist view, price history preview |
| Backend API | Node.js + Express | Proxy requests, data aggregation, auth |
| Scraper | Puppeteer + Cheerio | AliExpress data extraction |
| Cache | Redis | Price data, search results, rate limiting |
| Database | PostgreSQL | Price history, user data, product catalog |

---

## 2. API Specifications

### 2.1 REST API Endpoints

#### POST /api/search
Search for product matches on AliExpress.

**Request:**
```json
{
  "query": "Razer DeathAdder V2 Gaming Mouse",
  "amazonAsin": "B07Y1YQ1X7",
  "amazonPrice": 79.99,
  "category": "gaming_mouse",
  "specs": {
    "dpi": "20000",
    "connection": "wired",
    "rgb": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "ali_123456",
        "title": "Razer DeathAdder V2 Pro Wireless Gaming Mouse",
        "price": 45.99,
        "currency": "USD",
        "shipping": {
          "cost": 3.99,
          "method": "standard",
          "estimatedDays": "15-25"
        },
        "taxes": {
          "estimated": 4.50,
          "rate": "0.1"
        },
        "totalCost": 54.48,
        "savings": 25.51,
        "savingsPercent": 31.9,
        "rating": 4.7,
        "orders": 2847,
        "seller": {
          "name": "Razer Official Store",
          "rating": 4.9,
          "years": 5
        },
        "image": "https://...",
        "url": "https://aliexpress.com/item/123456",
        "coupons": [
          {
            "code": "RAZER10",
            "discount": "10%",
            "minOrder": 40.00
          }
        ],
        "matchingConfidence": 0.92
      }
    ],
    "queryTime": 1.24,
    "cacheHit": false
  }
}
```

#### GET /api/price-history/:productId
Retrieve price history for a tracked product.

**Response:**
```json
{
  "productId": "ali_123456",
  "history": [
    {
      "date": "2026-01-15",
      "price": 49.99,
      "shipping": 3.99,
      "total": 53.98
    },
    {
      "date": "2026-02-01",
      "price": 45.99,
      "shipping": 3.99,
      "total": 49.98
    }
  ],
  "lowestPrice": {
    "value": 42.99,
    "date": "2025-11-25"
  },
  "averagePrice": 47.50
}
```

#### POST /api/wishlist
Add product to user's wishlist.

**Request:**
```json
{
  "amazonProduct": {
    "asin": "B07Y1YQ1X7",
    "title": "Razer DeathAdder V2",
    "price": 79.99
  },
  "aliProduct": {
    "id": "ali_123456",
    "url": "https://aliexpress.com/item/123456"
  },
  "targetPrice": 50.00,
  "alertEnabled": true
}
```

---

## 3. Database Schema

### 3.1 PostgreSQL Tables

```sql
-- Products catalog
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amazon_asin VARCHAR(20) UNIQUE,
    aliexpress_id VARCHAR(50) UNIQUE,
    title VARCHAR(500),
    category VARCHAR(100),
    specs JSONB,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Price history (time-series)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    source VARCHAR(20) CHECK (source IN ('amazon', 'aliexpress')),
    price DECIMAL(10,2),
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    taxes DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2),
    recorded_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Create hypertable for time-series (if using TimescaleDB)
SELECT create_hypertable('price_history', 'recorded_at');

-- User wishlist
CREATE TABLE wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    target_price DECIMAL(10,2),
    alert_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Search cache
CREATE TABLE search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) UNIQUE,
    query TEXT,
    results JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_price_history_product ON price_history(product_id, recorded_at DESC);
CREATE INDEX idx_products_asin ON products(amazon_asin);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_wishlist_user ON wishlist(user_id);
```

### 3.2 Redis Key Structure

```
# Price cache (TTL: 1 hour)
price:ali:{product_id} -> {price_data_json}

# Search results cache (TTL: 30 min)
search:{query_hash} -> {results_json}

# Rate limiting
rate_limit:{ip} -> count

# Session store
session:{token} -> {user_data}

# Proxy rotation queue
proxies:available -> [proxy_list]
proxies:failed:{proxy_id} -> timestamp
```

---

## 4. Product Matching Algorithm

### 4.1 Multi-Factor Scoring

```typescript
interface MatchingResult {
  product: AliProduct;
  confidence: number;  // 0.0 - 1.0
  factors: {
    textSimilarity: number;
    specMatch: number;
    brandMatch: number;
    pricePlausibility: number;
    sellerReliability: number;
  };
}

function calculateMatchScore(amazon: Product, ali: Product): number {
  const weights = {
    textSimilarity: 0.35,
    specMatch: 0.30,
    brandMatch: 0.20,
    pricePlausibility: 0.10,
    sellerReliability: 0.05
  };
  
  const scores = {
    textSimilarity: cosineSimilarity(
      normalizeTitle(amazon.title),
      normalizeTitle(ali.title)
    ),
    specMatch: compareSpecs(amazon.specs, ali.specs),
    brandMatch: extractBrand(amazon.title) === extractBrand(ali.title) ? 1 : 0.3,
    pricePlausibility: validatePriceRatio(amazon.price, ali.price),
    sellerReliability: ali.seller.rating / 5
  };
  
  return Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + (scores[key] * weight);
  }, 0);
}
```

### 4.2 Text Normalization Pipeline

```typescript
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
    .replace(/\b(generation|gen|model|version|ver)\b/g, '')  // Remove fluff words
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => !STOPWORDS.includes(word))
    .join(' ');
}

const STOPWORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'with', 'for', 'from',
  'new', 'original', 'official', 'authentic', 'genuine'
];
```

---

## 5. Security & Compliance

### 5.1 Data Protection

| Requirement | Implementation |
|-------------|----------------|
| HTTPS Only | TLS 1.3 enforced, HSTS headers |
| Data Encryption | AES-256 at rest, TLS in transit |
| PII Handling | Hash emails, anonymize logs |
| GDPR | Right to deletion, data export |
| CCPA | Opt-out mechanism, disclosure |

### 5.2 API Security

```typescript
// Rate limiting middleware
const rateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,              // 30 requests per minute per IP
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
  }
});

// CORS configuration
const corsOptions = {
  origin: [
    'chrome-extension://*',
    'moz-extension://*',
    'https://alismart-finder.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

---

## 6. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | <500ms p95 | Backend endpoint latency |
| Extension Load | <100ms | Content script injection |
| Sidebar Render | <50ms | UI paint time |
| Price Update | <3s | Search to display |
| Cache Hit Rate | >70% | Redis cache ratio |
| Uptime | 99.9% | Service availability |

---

## 7. Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend (Extension) | Vue 3 + Vite | ^3.4 |
| Backend | Node.js + Express | 20 LTS |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 7+ |
| Scraper | Puppeteer | ^21.0 |
| Queue | BullMQ | ^4.0 |
| Monitoring | Prometheus + Grafana | Latest |
| Testing | Jest + Playwright | ^29 |
| Deployment | Docker + Kubernetes | 1.28+ |

---

*Document Version: 1.0*
*Last Updated: 2026-02-26*
