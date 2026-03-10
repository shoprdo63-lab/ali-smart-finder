import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config, validateEnvironment, logConfiguration } from './config/environment';
import { AliExpressService } from './services/aliexpress';
import searchRoutes, { initializeSearchService } from './routes/search';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter, searchLimiter } from './middleware/rateLimiter';
import { HealthResponse, ApiResponse } from './types';

/**
 * Initialize Express application
 */
function createApp(): express.Application {
  // Validate environment before starting
  validateEnvironment();
  logConfiguration();

  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.aliexpress.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests from Chrome extensions and localhost
      const allowedOrigins = [
        'chrome-extension://*',
        'moz-extension://*',
        'http://localhost:*',
        'https://localhost:*',
        'http://127.0.0.1:*',
        'https://127.0.0.1:*',
      ];

      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace('*', '')))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // General middleware
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static files (frontend dashboard)
  app.use(express.static('public'));

  // Logging
  if (config.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting
  app.use('/api', apiLimiter);

  // Initialize services
  const aliExpressService = new AliExpressService(
    config.ALI_APP_KEY,
    config.ALI_APP_SECRET,
    config.ALI_TRACKING_ID,
    config.CACHE_TTL
  );

  // Initialize route services
  initializeSearchService(aliExpressService);

  // Health check endpoint (no rate limiting)
  app.get('/health', (req, res) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const cacheStats = aliExpressService.getCacheStats();

    const healthData: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.floor(uptime),
      memory,
      cache: cacheStats,
    };

    res.json(healthData);
  });

  // API routes
  app.use('/api', searchLimiter, searchRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'World-Class Affiliate System API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          searchProduct: '/api/search-product (POST)',
          searchHealth: '/api/search-health (GET)',
          clearCache: '/api/clear-cache (POST)',
        },
        documentation: 'https://github.com/shoprdo63-lab/ali-smart-finder',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start server
 */
function startServer(): void {
  const app = createApp();

  app.listen(config.PORT, () => {
    console.log(`🚀 World-Class Affiliate System Server running on port ${config.PORT}`);
    console.log(`📊 Health check: http://localhost:${config.PORT}/health`);
    console.log(`🔍 Search API: http://localhost:${config.PORT}/api/search-product`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp, startServer };
