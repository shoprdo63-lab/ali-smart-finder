# TechOffice Price Hunter

**Professional arbitrage tool for Tech & Office niche products**

Find profitable products on AliExpress to resell on Amazon. Optimized for: ergonomic mice, mechanical keyboards, charging cables, studio lighting, and more.

---

## 📁 Project Structure

```
techoffice-price-hunter/
├── backend/
│   └── src/
│       ├── server.js              # Express API server
│       ├── routes/
│       │   ├── match.js           # /api/match-amazon, /api/match-aliexpress
│       │   └── search.js          # /api/search
│       └── services/
│           ├── amazonService.js   # Amazon product data
│           ├── aliexpressService.js # AliExpress integration
│           └── arbitrageCalculator.js # Profit calculation engine
│
└── extension/
    ├── manifest.json              # Extension manifest
    ├── src/
    │   ├── content-scripts/
    │   │   └── content.js         # Main content script with Dark Mode panel
    │   ├── popup/
    │   │   └── popup.html         # Extension popup UI
    │   ├── options/
    │   │   └── options.html       # Settings page
    │   └── background/
    │       └── background.js      # Service worker
    └── icons/
        ├── icon-16.png
        ├── icon-48.png
        └── icon-128.png
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Backend

```bash
npm run dev:backend
# or
node backend/src/server.js
```

Backend runs on `http://localhost:3000`

### 3. Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Navigate to any Amazon product page

---

## 📊 API Endpoints

### GET /api/match-amazon?asin=XXX&title=XXX

Returns Amazon product with matched AliExpress product and arbitrage calculation.

**Response:**
```json
{
  "success": true,
  "data": {
    "amazon": { "title", "price", "asin", "referralFee" },
    "aliexpress": { "title", "salePrice", "rating", "orders" },
    "arbitrage": {
      "netProfit": 15.50,
      "profitMargin": 35.2,
      "profitScore": 8,
      "riskLevel": "low",
      "colorCode": "#48bb78"
    },
    "affiliateUrl": "https://s.click.aliexpress.com/..."
  }
}
```

### GET /api/match-aliexpress?productId=XXX

Returns AliExpress product details with stock availability.

### GET /api/search?query=XXX

Search for Tech & Office products across platforms.

---

## 🎨 Features

### Content Script (Amazon Panel)

- **Profit Score (1-10)**: Based on margins, product reliability, and order volume
- **Net Profit Calculation**: Amazon Price - AliExpress Price - Amazon Fees (15%) - Shipping
- **Stock Availability**: Real-time AliExpress stock levels
- **Deep Link Affiliate URL**: Uses embedded `ali_smart_finder_v1` tracking ID
- **One-Click Image Downloader**: Downloads all product images (Pro feature)
- **MutationObserver**: Auto-detects dynamically loaded products
- **Glass-morphism Dark Mode**: Professional UI design

### Arbitrage Formula

```
Net Profit = Amazon Price - AliExpress Price - Amazon Referral Fee - Shipping Cost
Profit Score = f(Net Profit, Margin %, Order Volume, Seller Rating)
```

### Color Coding

| Profit Score | Color | Meaning |
|-------------|-------|---------|
| 8-10 | 🟢 Green | Excellent opportunity |
| 6-7 | 🟡 Yellow | Good opportunity |
| 4-5 | 🟠 Orange | Moderate risk |
| 1-3 | 🔴 Red | High risk / Avoid |

---

## ⚙️ Configuration

### Affiliate Key (Embedded)

The affiliate short key `ali_smart_finder_v1` is embedded in:
- `backend/src/routes/match.js`
- `extension/src/content-scripts/content.js`
- `extension/src/background/background.js`

### Backend URL

Default: `http://localhost:3000`

Change in:
- `extension/src/content-scripts/content.js` (CONFIG.backendUrl)
- `extension/src/background/background.js` (CONFIG.backendUrl)

---

## 🔧 Development Workflow

### Run Development Mode

```bash
# Start both backend and extension
npm run dev

# Or separately:
npm run dev:backend    # Backend only
npm run dev:extension  # Extension only
```

### Build for Production

```bash
npm run build
```

This creates a production-ready `extension/dist/` folder.

---

## 📦 Extension Installation

### Method 1: Developer Mode (Development)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder

### Method 2: Packaged Extension

1. Run `npm run build`
2. In Chrome extensions page, click **Pack extension**
3. Select the `extension/` folder
4. Drag the generated `.crx` file into Chrome

---

## 🎯 Monetization

### Subscription Check

Advanced features (Image Downloader) require active subscription:

```javascript
const CONFIG = {
  isSubscribed: true  // Set via license check
};
```

### Affiliate Commission

All AliExpress links use the embedded `ali_smart_finder_v1` tracking ID for commission.

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- Cheerio (web scraping)
- Node-cache (API caching)

**Extension:**
- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- CSS3 with glass-morphism effects

---

## 📝 License

Proprietary - TechOffice Price Hunter

---

## 🆘 Support

For issues or feature requests, contact support.

---

**Built with 💎 by Windsurf PRO**
