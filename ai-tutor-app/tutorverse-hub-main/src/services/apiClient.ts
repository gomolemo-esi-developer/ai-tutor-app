/**
 * Real API Client - Connects to Backend on Port 3000
 * Replaces mockApiService for production data
 * 
 * Usage:
 *   import { createApiClient } from '@/services/apiClient';
 *   const api = createApiClient({ baseURL: 'http://localhost:3000' });
 *   
 *   const departments = await api.get('/api/admin/departments');
 *   await api.post('/api/admin/departments', { name: 'CS', code: 'CS' });
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  timestamp: number;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  debug?: boolean;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private debug: boolean;
  private token: string | null = null;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000;
    this.debug = config.debug || false;

    if (this.debug) {
      console.log('🚀 ApiClient initialized:', {
        baseURL: this.baseURL,
        timeout: this.timeout,
      });
    }
  }

  /**
   * Set JWT token after login
   * Token will be sent in Authorization header for all requests
   */
  setToken(token: string | null): void {
    this.token = token;
    if (this.debug) {
      console.log('🔐 JWT token:', token ? 'SET' : 'CLEARED');
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Clear token (logout)
   */
  clearToken(): void {
    this.token = null;
    if (this.debug) console.log('🔐 Token cleared');
  }

  /**
   * Generic request method
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: { skipAuth?: boolean; timeout?: number }
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add JWT token to Authorization header
    if (this.token && !options?.skipAuth) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

    if (this.debug) {
      console.log(`📤 ${method} ${endpoint}`, data || '');
    }

    try {
      const controller = new AbortController();
      const requestTimeout = options?.timeout || this.timeout;
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }

        const error: ApiError = new Error(
          errorData.error || `HTTP ${response.status}`
        );
        error.status = response.status;
        error.code = errorData.code;
        error.details = errorData.details;

        if (this.debug) {
          console.error(`❌ ${response.status} ${endpoint}:`, error.message);
        }

        throw error;
      }

      // Parse successful response
      const result: ApiResponse<T> = await response.json();

      if (!result.success) {
        const error: ApiError = new Error(result.error || 'Unknown error');
        error.code = result.code;
        error.details = result.details;
        throw error;
      }

      if (this.debug) {
        console.log(`✅ ${method} ${endpoint}:`, result.data);
      }

      return result.data as T;
    } catch (error: any) {
      if (this.debug) {
        console.error(`🔥 ${method} ${endpoint}:`, error.message);
      }

      // Re-throw with context
      throw error;
    }
  }

  /**
   * GET request
   */
  get<T = any>(endpoint: string, options?: { skipAuth?: boolean }): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * POST request
   */
  post<T = any>(
    endpoint: string,
    data: any,
    options?: { skipAuth?: boolean; timeout?: number }
  ): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * PUT request
   */
  put<T = any>(
    endpoint: string,
    data: any,
    options?: { skipAuth?: boolean }
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * PATCH request
   */
  patch<T = any>(
    endpoint: string,
    data: any,
    options?: { skipAuth?: boolean }
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * DELETE request
   */
  delete<T = any>(
    endpoint: string,
    options?: { skipAuth?: boolean }
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Upload file to S3 presigned URL
   */
  async uploadToPresignedUrl(
    presignedUrl: string,
    file: File
  ): Promise<void> {
    if (this.debug) {
      console.log('📤 Uploading file to S3:', file.name);
    }

    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: HTTP ${response.status}`);
      }

      if (this.debug) {
        console.log('✅ File uploaded to S3:', file.name);
      }
    } catch (error: any) {
      if (this.debug) {
        console.error('🔥 S3 upload error:', error.message);
      }
      throw error;
    }
  }
}

/**
 * Factory function to create API client
 */
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};

/**
 * Create global API client instance with config from environment
 */
export const createGlobalApiClient = (): ApiClient => {
  const baseURL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:3000' : '');
  const debug = import.meta.env.DEV;

  return createApiClient({
    baseURL,
    timeout: 30000,
    debug,
  });
};

export default createApiClient;
