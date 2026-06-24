const DEFAULT_BACKEND_URL = 'http://localhost:5000';

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  cacheStatus?: string;
}

export interface PaginationInfo {
  limit: number;
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ProductsResponse {
  items: Product[];
  pagination: PaginationInfo;
  dbExecutionTimeMs?: number;
  cacheStatus?: string;
}

export interface CacheMetrics {
  status: string;
  hitRate: string;
  hits: number;
  misses: number;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined'
      ? ((window as any).__BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL)
      : (process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL);
  }

  // Get current Backend URL
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Set Backend URL
  setBaseUrl(url: string): void {
    this.baseUrl = url;
    if (typeof window !== 'undefined') {
      (window as any).__BACKEND_URL = url;
    }
  }

  // GET Cache Performance Metrics
  async getCacheMetrics(): Promise<CacheMetrics> {
    const response = await fetch(`${this.baseUrl}/api/products/metrics/cache`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // GET Products (Paginated)
  async getProducts({ 
    limit = 10, 
    cursor = null, 
    category = '', 
    name = '' 
  }: { 
    limit?: number; 
    cursor?: string | null; 
    category?: string; 
    name?: string; 
  } = {}): Promise<ProductsResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);
    if (category) params.append('category', category);
    if (name) params.append('name', name);

    const response = await fetch(`${this.baseUrl}/api/products?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const cacheStatus = response.headers.get('X-Cache') || 'MISS';
    const data: ProductsResponse = await response.json();
    if (data && typeof data === 'object') {
      data.cacheStatus = cacheStatus;
    }
    return data;
  }
}

const api = new ApiService();
export default api;
