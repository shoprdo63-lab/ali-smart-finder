// Product information interfaces
export interface AmazonProduct {
  title: string;
  price: string;
  currency: string;
  url: string;
  asin: string;
  imageUrl?: string;
}

export interface AliExpressProduct {
  id: string;
  title: string;
  imageUrl: string;
  originalPrice: string;
  salePrice: string;
  currency: string;
  discount: number;
  rating: number;
  orders: number;
  productUrl: string;
  affiliateUrl: string;
  packageType: string;
  seller: {
    name: string;
    rating: number;
  };
}

export interface PriceComparison {
  amazon: AmazonProduct;
  aliexpress: AliExpressProduct[];
  cheapestAliExpress?: AliExpressProduct;
  savings?: {
    amount: number;
    percentage: number;
  };
}

export interface ExtensionConfig {
  backendApiUrl: string;
  enabled: boolean;
  autoShow: boolean;
}

export interface PriceBoxState {
  isVisible: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  position: { x: number; y: number };
  comparison?: PriceComparison;
  error?: string;
}

// UI Component interfaces
export interface DraggableElement {
  element: HTMLElement;
  isDragging: boolean;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

// API Response interfaces
export interface SearchResponse {
  success: boolean;
  data: {
    products: AliExpressProduct[];
    query: string;
    total: number;
    message?: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
