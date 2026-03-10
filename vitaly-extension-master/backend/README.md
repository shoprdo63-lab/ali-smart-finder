# AliSmart Finder Backend API

Backend server for the AliSmart Finder Chrome extension.

## Features

- Product search and matching between Amazon and AliExpress
- Affiliate link generation
- Price comparison
- Caching for performance
- CORS enabled for Chrome extensions

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Add your AliExpress API credentials to `.env`:
```
ALI_APP_KEY=your_key_here
ALI_APP_SECRET=your_secret_here
```

4. Start the server:
```bash
npm run dev
```

Server will run on `http://localhost:3000`

## Production Deployment

### Deploy to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: ali-smart-finder-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add Environment Variables:
   - `NODE_ENV=production`
   - `ALI_APP_KEY=your_key`
   - `ALI_APP_SECRET=your_secret`
7. Click "Create Web Service"

Your API will be available at: `https://your-app-name.onrender.com`

### Deploy to Railway

1. Push your code to GitHub
2. Go to [Railway](https://railway.app/)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add Environment Variables:
   - `NODE_ENV=production`
   - `ALI_APP_KEY=your_key`
   - `ALI_APP_SECRET=your_secret`
6. Railway will auto-deploy

Your API will be available at: `https://your-app.railway.app`

## API Endpoints

- `GET /health` - Health check
- `GET /api/health` - API health check
- `POST /api/search` - Search for products

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ALI_APP_KEY` | Yes | AliExpress API App Key |
| `ALI_APP_SECRET` | Yes | AliExpress API App Secret |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |

## After Deployment

1. Copy your production URL (e.g., `https://your-app.onrender.com`)
2. Update the extension code:
   - Replace `https://your-app.onrender.com` with your actual URL in all files
3. Rebuild the extension
4. Upload to Chrome Web Store
