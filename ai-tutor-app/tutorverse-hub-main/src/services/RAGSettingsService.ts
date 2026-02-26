/**
 * RAG Settings Service
 *
 * Client-side service for managing RAG system settings
 * Communicates with backend middleware which proxies to RAG service
 */

import { createGlobalApiClient } from './apiClient';

// Create API client instance
const apiClient = createGlobalApiClient();

export interface RAGSettings {
  llm_model: string;
  temperature: number;
  embedding_model: string;
  retrieval_top_k: number;
  custom_prompt: string;
  quiz_prompt: string;
  offline_mode: boolean;
  lm_studio_url: string;
  lm_studio_model: string;
  available_models: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export interface RAGError {
  error: string;
  message: string;
  statusCode: number;
}

class RAGSettingsServiceClass {
  private baseUrl = '/api/rag/settings';

  /**
   * Get all RAG settings in one call
   * Useful for initial component load
   */
  async getRAGSettings(): Promise<RAGSettings> {
    try {
      const response = await apiClient.get<RAGSettings>(`${this.baseUrl}/config`);
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update LLM model
   */
  async updateModel(modelId: string): Promise<{ success: boolean; model: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; model: string }>(`${this.baseUrl}/model`, {
        model_id: modelId,
      });
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update temperature
   * @param temperature Value between 0.0 and 2.0
   */
  async updateTemperature(temperature: number): Promise<{ success: boolean; temperature: number }> {
    if (temperature < 0.0 || temperature > 2.0) {
      throw new Error('Temperature must be between 0.0 and 2.0');
    }

    try {
      const response = await apiClient.post<{ success: boolean; temperature: number }>(`${this.baseUrl}/temperature`, {
        temperature,
      });
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update embedding model
   */
  async updateEmbedding(embeddingModel: string): Promise<{ success: boolean; embedding_model: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; embedding_model: string }>(`${this.baseUrl}/embedding`, {
        embedding_model: embeddingModel,
      });
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update retrieval settings (top-k)
   * @param topK Value between 5 and 100
   */
  async updateRetrieval(topK: number): Promise<{ success: boolean; top_k: number }> {
    if (topK < 5 || topK > 100) {
      throw new Error('top_k must be between 5 and 100');
    }

    try {
      const response = await apiClient.post<{ success: boolean; top_k: number }>(`${this.baseUrl}/retrieval`, {
        top_k: topK,
      });
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update custom prompts
   */
  async updatePrompts(
    customPrompt?: string,
    quizPrompt?: string
  ): Promise<{
    success: boolean;
    custom_prompt: string;
    quiz_prompt: string;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        custom_prompt: string;
        quiz_prompt: string;
      }>(`${this.baseUrl}/prompts`, {
        custom_prompt: customPrompt,
        quiz_prompt: quizPrompt,
      });
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Update offline mode settings
   */
  async updateOfflineMode(
    offlineMode: boolean,
    lmStudioUrl?: string,
    lmStudioModel?: string
  ): Promise<{
    success: boolean;
    offline_mode: boolean;
    lm_studio_url: string;
    lm_studio_model: string;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        offline_mode: boolean;
        lm_studio_url: string;
        lm_studio_model: string;
      }>(`${this.baseUrl}/offline`, {
        offline_mode: offlineMode,
        lm_studio_url: lmStudioUrl,
        lm_studio_model: lmStudioModel,
      });
      return response;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors and return user-friendly messages
   */
  private handleError(error: any): RAGError {
    if (error.response) {
      // Backend returned an error response
      const data = error.response.data;
      return {
        error: data.error || 'API Error',
        message: data.message || error.message || 'An error occurred',
        statusCode: error.response.status,
      };
    }

    if (error.request) {
      // Request made but no response received
      return {
        error: 'Network Error',
        message: 'Could not connect to the server. Check your internet connection.',
        statusCode: 0,
      };
    }

    // Client-side error
    return {
      error: 'Error',
      message: error.message || 'An unknown error occurred',
      statusCode: 0,
    };
  }

  /**
   * Check if an error is a RAG service unavailable error
   */
  isRAGUnavailable(error: any): boolean {
    return error?.statusCode === 503 || error?.error === 'RAG service unavailable';
  }

  /**
   * Check if an error is because RAG is disabled
   */
  isRAGDisabled(error: any): boolean {
    return error?.statusCode === 503 && error?.error === 'RAG service is not enabled';
  }
}

// Export singleton instance
export const RAGSettingsService = new RAGSettingsServiceClass();
