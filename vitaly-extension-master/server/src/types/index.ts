export interface AliExpressProduct {
  productId: string;
  title: string;
  imageUrl: string;
  originalPrice: number;
  salePrice: number;
  currency: string;
  discount: number;
  rating: number;
  orders: number;
  productUrl: string;
  affiliateUrl: string;
  seller: {
    name: string;
    rating: number;
  };
}

export interface AmazonProduct {
  title: string;
  price: number;
  currency: string;
  url: string;
  asin: string;
  imageUrl?: string;
}

export interface SearchRequest {
  title?: string;
  url?: string;
  maxResults?: number;
}

export interface SearchResponse {
  success: boolean;
  data?: {
    products: AliExpressProduct[];
    query: string;
    total: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cache: {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  timestamp: string;
}

export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  ALI_APP_KEY: string;
  ALI_APP_SECRET: string;
  ALI_TRACKING_ID: string;
  CACHE_TTL: number;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
}
