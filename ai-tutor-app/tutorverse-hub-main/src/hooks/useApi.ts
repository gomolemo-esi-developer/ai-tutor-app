/**
 * useApi Hook - REAL BACKEND
 * Connects to Express backend on port 3000
 * Automatically includes JWT token from AuthContext
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createApiClient } from '@/services/apiClient';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface UseApiReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  get: (endpoint: string) => Promise<T | null>;
  post: (endpoint: string, body: Record<string, unknown>) => Promise<T | null>;
  put: (endpoint: string, body: Record<string, unknown>) => Promise<T | null>;
  delete: (endpoint: string) => Promise<boolean>;
  del: (endpoint: string) => Promise<boolean>;
}

export const useApi = <T = any>(): UseApiReturn<T> => {
  const { user, token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create API client instance with token dependency
  const apiClient = useMemo(() => {
    const client = createApiClient({
      baseURL:
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:3000',
      timeout: 30000,
      debug: import.meta.env.DEV,
    });

    // Set token if available
    if (token) {
      console.log('🔐 Setting JWT token in API client');
      client.setToken(token);
    } else {
      console.warn('⚠️ No JWT token available for API calls');
    }

    return client;
  }, [token]);

  const handleRequest = useCallback(
    async (
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      body?: Record<string, unknown>
    ) => {
      setLoading(true);
      setError(null);
      try {
        console.log(`📡 [${method}] Requesting: ${endpoint}`, {
          hasToken: !!token,
          baseURL: apiClient.getToken ? 'client ready' : 'no client',
        });

        let response: T | null = null;

        if (method === 'GET') {
          response = await apiClient.get<T>(endpoint);
        } else if (method === 'POST') {
          response = await apiClient.post<T>(endpoint, body);
        } else if (method === 'PUT') {
          response = await apiClient.put<T>(endpoint, body);
        } else if (method === 'DELETE') {
          response = await apiClient.delete<T>(endpoint);
        }

        setData(response || null);
        return response || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error(`API Error [${method} ${endpoint}]:`, errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, token]
  );

  const get = useCallback(
    (endpoint: string) => handleRequest(endpoint, 'GET'),
    [handleRequest]
  );

  const post = useCallback(
    (endpoint: string, body: any) =>
      handleRequest(endpoint, 'POST', body),
    [handleRequest]
  );

  const put = useCallback(
    (endpoint: string, body: any) =>
      handleRequest(endpoint, 'PUT', body),
    [handleRequest]
  );

  const del = useCallback(
    async (endpoint: string) => {
      const result = await handleRequest(endpoint, 'DELETE');
      return result !== null;
    },
    [handleRequest]
  );

  return {
    data,
    loading,
    error,
    get,
    post,
    put,
    delete: del,
    del,
  };
};
