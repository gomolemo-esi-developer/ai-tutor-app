/**
 * useMockApi Hook
 * Safe hook for using mock data with async behavior
 * Returns data in API-like format
 */

import { useState, useCallback } from 'react';
import mockApiService from '@/services/mockApiService';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface UseMockApiReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  get: (endpoint: string) => Promise<T | null>;
  post: (endpoint: string, body: Record<string, unknown>) => Promise<T | null>;
  put: (endpoint: string, body: Record<string, unknown>) => Promise<T | null>;
  delete: (endpoint: string) => Promise<boolean>;
  del: (endpoint: string) => Promise<boolean>;
}

export const useMockApi = <T = any>(): UseMockApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = useCallback(
    async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let response: ApiResponse<T> & any;

        // Route to appropriate mock service method
        if (endpoint.includes('/admin/stats')) {
          response = (await mockApiService.getAdminStats()) as any;
        } else if (endpoint.includes('/admin/campuses')) {
          response = (await mockApiService.getCampuses()) as any;
        } else if (endpoint.includes('/admin/departments')) {
          response = (await mockApiService.getDepartments()) as any;
        } else if (endpoint.includes('/admin/courses')) {
          response = (await mockApiService.getCourses()) as any;
        } else if (endpoint.includes('/educators/modules')) {
          response = (await mockApiService.getEducatorModules()) as any;
        } else if (endpoint.includes('/educators/profile')) {
          response = (await mockApiService.getEducatorProfile()) as any;
        } else if (endpoint.includes('/educators/files')) {
          const moduleId = new URL(endpoint, 'http://localhost').searchParams.get('moduleId');
          response = (await mockApiService.getEducatorFiles(moduleId || undefined)) as any;
        } else if (endpoint.includes('/students/profile')) {
          response = (await mockApiService.getStudentProfile()) as any;
        } else if (endpoint.includes('/students/modules')) {
          response = (await mockApiService.getStudentModules()) as any;
        } else if (endpoint.includes('/chat/') && endpoint.includes('/messages')) {
          const chatId = endpoint.split('/')[2];
          response = (await mockApiService.getChatMessages(chatId)) as any;
        } else if (endpoint.includes('/chat')) {
          response = (await mockApiService.getChats()) as any;
        } else if (method === 'POST') {
          response = (await mockApiService.createItem(endpoint, body)) as any;
        } else if (method === 'PUT') {
          response = (await mockApiService.updateItem(endpoint, body)) as any;
        } else if (method === 'DELETE') {
          response = (await mockApiService.deleteItem(endpoint)) as any;
        } else {
          response = { data: null };
        }

        setData(response.data || null);
        return response.data || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Mock API Error:', errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const get = useCallback(
    (endpoint: string) => handleRequest(endpoint, 'GET'),
    [handleRequest]
  );

  const post = useCallback(
    (endpoint: string, body: any) => handleRequest(endpoint, 'POST', body),
    [handleRequest]
  );

  const put = useCallback(
    (endpoint: string, body: any) => handleRequest(endpoint, 'PUT', body),
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

export default useMockApi;
