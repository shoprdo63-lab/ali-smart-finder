import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root directory FIRST
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('[Server] Loading .env from:', envPath);
console.log('[Server] ALI_APP_KEY loaded:', process.env.ALI_APP_KEY ? 'YES' : 'NO');
console.log('[Server] ALI_APP_KEY value:', process.env.ALI_APP_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS: Allow ALL origins for extension compatibility
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-API-Key']
}));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`\n🔵 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`📍 Origin: ${req.headers.origin || 'no-origin'}`);
  if (req.method === 'POST' || req.method === 'GET') {
    console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 Query:`, JSON.stringify(req.query, null, 2));
  }
  next();
});

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API health check (for extension status)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AliSmart Finder API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Load routes dynamically after env is set
async function loadRoutes() {
  const { default: searchRouter } = await import('./routes/search.js');
  app.use('/api', searchRouter);
  
  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: {
        message: err.message || 'Internal server error'
      }
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 AliSmart Finder API v2.0.0 running on port ${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 Search API: http://localhost:${PORT}/api/search`);
    console.log(`🔑 API Key: ${process.env.ALI_APP_KEY ? '✓ Set' : '✗ Missing'}`);
  });
}

loadRoutes();

export default app;
