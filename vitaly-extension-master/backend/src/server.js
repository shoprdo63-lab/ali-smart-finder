import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import searchRouter from './routes/search.js';
import authRouter from './routes/auth.js';
import wishlistRouter from './routes/wishlist.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow extension to connect
  crossOriginEmbedderPolicy: false
}));

// CORS for extension
app.use(cors({
  origin: [
    'chrome-extension://mbblfpmhmmcjacofmccnmnnfdadhkkml',
    'chrome-extension://*',
    'moz-extension://*',
    'http://localhost:3000',
    'http://localhost:*',
    'https://alismart-finder.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint - CRITICAL for extension status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AliSmart Finder API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/search', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/wishlist', wishlistRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AliSmart Finder API',
    version: '2.0.0',
    endpoints: [
      '/api/health',
      '/api/search',
      '/api/auth',
      '/api/wishlist'
    ],
    documentation: 'https://alismart-finder.com/docs'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.path
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     🚀 AliSmart Finder API Server v2.0.0              ║
║                                                        ║
║     Running on http://localhost:${PORT}                   ║
║                                                        ║
║     Health Check: http://localhost:${PORT}/api/health    ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

export default app;
