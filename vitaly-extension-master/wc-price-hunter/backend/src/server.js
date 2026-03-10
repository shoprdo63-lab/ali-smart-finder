import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*', 'https://localhost:*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      aliexpress: process.env.ALI_APP_KEY ? 'configured' : 'mock',
      cache: 'active',
      matcher: 'active'
    }
  });
});

// API routes
app.use('/api', apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 WC PRICE HUNTER - WORLD CLASS BACKEND v2.0`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🔍 API: http://localhost:${PORT}/api/match-amazon`);
  console.log(`🔍 API: http://localhost:${PORT}/api/match-aliexpress`);
  console.log(`\n🔐 Configuration:`);
  console.log(`   ALI_APP_KEY: ${process.env.ALI_APP_KEY ? '✓ Set' : '✗ Missing (mock mode)'}`);
  console.log(`   ALI_APP_SECRET: ${process.env.ALI_APP_SECRET ? '✓ Set' : '✗ Missing (mock mode)'}`);
  console.log(`   ALI_TRACKING_ID: ${process.env.ALI_TRACKING_ID || 'NOT_SET'}`);
  console.log(`   CACHE_TTL: ${process.env.CACHE_TTL || 600}s`);
  console.log(`   MATCH_THRESHOLD: ${process.env.MATCH_THRESHOLD || 0.75}`);
  console.log(`\n✅ Server ready - waiting for requests...`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

export default app;
