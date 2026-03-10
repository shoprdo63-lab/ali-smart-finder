# GameTech Arbitrage Pro

**A World-Class Chrome Extension + Node.js Backend for Gaming & Tech Gadgets Arbitrage**

[![CI/CD](https://github.com/gametech-arbitrage/pro/actions/workflows/ci.yml/badge.svg)](https://github.com/gametech-arbitrage/pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Overview

GameTech Arbitrage Pro is a premium Chrome extension that helps Amazon sellers find profitable Gaming & Tech Gadgets arbitrage opportunities by comparing Amazon prices with AliExpress prices.

### Key Features

- 🎮 **Gaming & Tech Only**: Strict niche filtering - only activates for keyboards, mice, monitors, headphones, microphones, webcams, controllers, studio gear, and PC parts
- 🚫 **Fashion Blocked**: 100% enforcement against clothing, shoes, jewelry, and cosmetics
- 💰 **Profit Calculator**: Calculates profit margin and score (1-10) with breakdown
- 🎨 **Premium UI**: Dark glass-morphism panel with Neon Blue (#00BFFF) accents
- 📸 **Image Downloader**: One-click download of all product images
- 🔒 **Security**: Affiliate keys stored server-side only, never exposed to client

## 🏗️ Architecture

```
gametech-arbitrage-pro/
├── extension/          # Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── content-script.ts      # Main injection script
│   │   ├── background.ts          # Service worker
│   │   ├── panel/
│   │   │   └── panel-renderer.ts  # Glass-morphism UI
│   │   └── services/
│   │       ├── niche-validator.ts     # Client-side niche filtering
│   │       ├── product-extractor.ts   # Amazon data extraction
│   │       └── image-downloader.ts    # Image download handler
│   └── manifest.json
├── backend/            # Node.js/Express Backend
│   ├── src/
│   │   ├── server.ts           # Express server
│   │   ├── routes/api.ts       # API endpoints
│   │   ├── services/
│   │   │   ├── profit.ts       # Profit calculation
│   │   │   ├── niche-filter.ts # Server-side niche filtering
│   │   │   └── scraper.ts      # AliExpress scraper
│   │   └── middleware/
│   │       └── security.ts     # Security middleware
│   └── tests/
└── .github/workflows/  # CI/CD
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Chrome Browser
- (Optional) Docker & Docker Compose

### Installation

```bash
# Clone repository
git clone https://github.com/gametech-arbitrage/pro.git
cd gametech-arbitrage-pro

# Install dependencies
npm install

# Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your affiliate key
```

### Development

```bash
# Start backend
cd backend && npm run dev

# In another terminal - start extension development
npm run dev:extension

# Or run both with concurrently
npm run dev
```

### Build

```bash
# Build everything
npm run build

# Build only backend
cd backend && npm run build

# Build only extension
cd extension && npm run build
```

## 📋 Environment Variables

Create `backend/.env`:

```env
# Required
AFFILIATE_KEY=ali_smart_finder_v1

# Optional (for premium API endpoints)
API_KEY=your-api-key-here

# Optional (for AliExpress API integration)
ALI_APP_KEY=your-aliexpress-app-key
ALI_APP_SECRET=your-aliexpress-app-secret

# Optional (for Redis caching)
REDIS_URL=redis://localhost:6379

# Server settings
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

⚠️ **Security**: Never commit `.env` files with real secrets!

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
cd backend && npm test

# With coverage
cd backend && npm run coverage

# E2E tests
npm run test:e2e
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

## 📦 Chrome Extension Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/dist/` folder
5. The extension icon should appear in your toolbar

### Testing on Amazon

1. Navigate to any Amazon product page (e.g., `/dp/B08N5WRWNW`)
2. Wait for the panel to appear (auto-detects after page load)
3. Use keyboard shortcut `Alt+Shift+F` to focus panel

## 🔧 Configuration

### Niche Categories

Approved categories (defined in `niche-filter.ts`):
- keyboard
- mouse
- monitor
- headphones
- microphone
- webcam
- controller
- studio-gear
- pc-parts
- accessories

### Blocked Categories

100% blocked with immediate rejection:
- clothing, shirt, t-shirt, pants, jeans, dress
- shoes, sneakers, boots, handbag
- jewelry, watch, makeup, cosmetic, perfume

### Profit Score Algorithm

```
Score 10: margin >= 40% AND profit >= $50
Score 8-9: margin >= 30% AND profit >= $30
Score 6-7: margin >= 20% AND profit >= $15
Score 3-5: margin >= 8-15% AND profit >= $3-10
Score 1-2: margin < 8% OR profit < $3
```

## 🔒 Security

### Affliate Key Protection

- **Server-side only**: `AFFILIATE_KEY` is stored in backend `.env`
- **Never exposed**: Key is never sent to client or stored in extension
- **Build-time injection**: Key is only used server-side when building affiliate URLs

### Content Security Policy

Extension CSP:
```json
{
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### API Security

- Rate limiting: 100 requests per 15 minutes per IP
- Input validation with Zod schemas
- CORS configured for Chrome extensions only
- Helmet middleware for security headers

## 📊 API Endpoints

### POST /api/v1/find

Find AliExpress matches for Amazon product.

**Request:**
```json
{
  "asin": "B08N5WRWNW",
  "title": "Logitech G Pro Keyboard",
  "price": 129.99,
  "category": "gaming"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "asin": "B08N5WRWNW",
    "matched": true,
    "aliExpress": {
      "title": "...",
      "price": 45.99,
      "productUrl": "https://s.click.aliexpress.com/...",
      "rating": 4.5,
      "orders": 1234
    },
    "profit": {
      "profit": 54.15,
      "profitMargin": 41.65,
      "profitScore": 10,
      "recommendation": "high"
    },
    "niche": {
      "category": "keyboard",
      "confidence": 0.95
    }
  }
}
```

### POST /api/v1/images

Proxy images for download.

**Request:**
```json
{
  "asin": "B08N5WRWNW",
  "imageUrls": ["https://m.media-amazon.com/..."]
}
```

## 🎨 Design System

### Colors

- **Neon Blue Primary**: `#00BFFF`
- **Neon Blue Glow**: `rgba(0, 191, 255, 0.5)`
- **Background Dark**: `rgba(20, 20, 35, 0.95)`
- **Success (High Score)**: `#00ff88`
- **Warning (Medium)**: `#ffaa00`
- **Danger (Low)**: `#ff4444`

### Typography

- **Font Family**: System UI stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`)
- **Panel Width**: 380px
- **Border Radius**: 16px

## 📝 Changelog

### v1.0.0

- Initial release
- Glass-morphism UI with Neon Blue accents
- Profit calculation with score 1-10
- Strict niche filtering (Gaming & Tech only)
- Image download feature
- Backend with Express + TypeScript
- CI/CD with GitHub Actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Maintain 90%+ coverage for critical modules
- Follow ESLint and Prettier rules
- Update documentation for API changes

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🆘 Support

- 📧 Email: support@gametech-arbitrage.com
- 💬 Discord: [Join our server](https://discord.gg/gametech)
- 🐛 Issues: [GitHub Issues](https://github.com/gametech-arbitrage/pro/issues)

## 🔗 Links

- [Chrome Web Store](https://chrome.google.com/webstore/detail/...)
- [Documentation](https://docs.gametech-arbitrage.com)
- [API Reference](https://api.gametech-arbitrage.com)

---

**Built with ❤️ for the Gaming & Tech community**
