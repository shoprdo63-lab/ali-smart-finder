# AliSmart Finder - Product Roadmap & Technical Specifications

## Executive Summary
World-class browser extension for Gaming/Tech price comparison between Amazon and AliExpress.

---

## Phase 1: MVP (Weeks 1-4)

### Goals
- Core price comparison functionality
- Chrome extension with right-sidebar UI
- Basic AliExpress scraping backend
- Gaming/Tech product filtering

### Key Deliverables
| Week | Deliverable | Owner |
|------|-------------|-------|
| 1 | Extension manifest, content script injection, Amazon page detection | Frontend Dev |
| 1 | Backend scaffold, /api/search endpoint, proxy rotation basics | Backend Dev |
| 2 | Product matching algorithm (title similarity + keyword scoring) | ML/Algo Dev |
| 2 | Glass-morphism sidebar UI, dark theme implementation | UI/UX Dev |
| 3 | AliExpress scraper with Puppeteer/Playwright, caching layer | Backend Dev |
| 3 | Price calculation (product + shipping estimates) | Backend Dev |
| 4 | E2E testing, Chrome Web Store prep, bug fixes | QA + All |

### MVP Features
- ✅ Auto-detect Amazon product pages
- ✅ Tech-only filter (block kitchen/furniture/clothing)
- ✅ Real-time AliExpress price search
- ✅ Right sidebar with `backdrop-filter: blur(15px)`
- ✅ Basic price comparison display
- ✅ Local wishlist (localStorage)
- ⚠️ 80% matching accuracy target

### MVP Resources
- 1 Full-stack lead (you)
- 1 UI/UX Designer (shared)
- 1 QA Engineer (part-time)

---

## Phase 2: V1 (Weeks 5-10)

### Goals
- Price history tracking
- Multi-browser support (Firefox, Edge)
- User accounts & cloud sync
- Email/push notifications

### Key Deliverables
| Week | Deliverable |
|------|-------------|
| 5 | PostgreSQL schema, price history tables, time-series data |
| 5 | User auth (JWT), OAuth with Google/GitHub |
| 6 | Price history graphs (Chart.js/D3), 6-month data retention |
| 6 | Background script for price monitoring |
| 7 | Firefox/Edge manifest v2/v3 compatibility |
| 7 | Notification system (web-push, email via SendGrid) |
| 8 | Wishlist sync across devices |
| 8 | Coupon detection algorithm |
| 9 | Mobile-responsive popup UI |
| 10 | Security audit, GDPR compliance, privacy policy |

### V1 Features
- 📊 Price history graphs (6-12 months)
- 🔔 Price drop alerts (push/email)
- ☁️ Cloud sync wishlist
- 🎟️ Auto coupon detection
- 🌐 Firefox + Edge support
- 👤 User accounts

### V1 Resources
- 2 Backend developers
- 1 Frontend developer
- 1 DevOps engineer (part-time)
- 1 Product designer

---

## Phase 3: V2 (Weeks 11-16)

### Goals
- AI-powered product matching
- Image similarity search
- Mobile app (React Native)
- Affiliate integration

### Key Deliverables
| Week | Deliverable |
|------|-------------|
| 11 | CLIP/image embedding service (Python/FastAPI) |
| 11 | Visual similarity matching pipeline |
| 12 | Advanced NLP for product spec extraction |
| 12 | EAN/UPC barcode lookup integration |
| 13 | React Native mobile app scaffold |
| 13 | Mobile price scanner (camera) |
| 14 | Affiliate network integration (Amazon, AliExpress) |
| 14 | Cashback tracking system |
| 15 | Expanded marketplaces (Banggood, DHGate) |
| 16 | Premium tier launch, team collaboration features |

### V2 Features
- 🤖 AI image similarity matching
- 📱 Mobile app (iOS/Android)
- 🔍 Visual product search
- 💰 Cashback/affiliate integration
- 🌍 Additional marketplaces
- ⭐ Premium subscription tier

### V2 Resources
- 3 Backend developers
- 2 Frontend developers
- 1 Mobile developer
- 1 ML engineer
- 1 DevOps engineer
- 1 Growth/marketing

---

## Resource Summary

| Phase | Duration | Team Size | Est. Cost |
|-------|----------|-----------|-----------|
| MVP | 4 weeks | 2.5 FTE | $25K-35K |
| V1 | 6 weeks | 4.5 FTE | $60K-80K |
| V2 | 6 weeks | 7 FTE | $100K-140K |
| **Total** | **16 weeks** | **-** | **$185K-255K** |

---

## Critical Path Dependencies

```
[Amazon Detection] → [Product Matching] → [Price Display]
       ↓                  ↓                    ↓
[AliExpress Scraper] → [Caching Layer] → [Sidebar UI]
       ↓                  ↓                    ↓
   [Proxy Rotation]   [Redis/DB]          [E2E Tests]
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AliExpress blocks scraper | Proxy rotation + request throttling + user-agent spoofing |
| Amazon API restrictions | Use page scraping as fallback, respect robots.txt |
| Matching accuracy low | Hybrid algo: NLP + specs + image similarity (V2) |
| Chrome Store rejection | Pre-review compliance check, clear privacy policy |
| Rate limiting | Exponential backoff, queue system (Bull/BullMQ) |

---

## Success Metrics

| Metric | MVP Target | V1 Target | V2 Target |
|--------|------------|-----------|-----------|
| Matching Accuracy | 80% | 90% | 95% |
| Response Time | <3s | <2s | <1.5s |
| Daily Active Users | 100 | 1,000 | 10,000 |
| Chrome Store Rating | 4.0★ | 4.5★ | 4.7★ |
| Test Coverage | 70% | 80% | 85% |

---

*Document Version: 1.0*
*Last Updated: 2026-02-26*
