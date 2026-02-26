/**
 * RAG Settings Proxy Routes
 *
 * This module provides API endpoints for managing RAG (Retrieval-Augmented Generation)
 * system settings. All endpoints proxy requests to the RAG service while respecting
 * the RAG_ENABLE flag and handling errors gracefully.
 *
 * Architecture:
 * - Frontend (tutorverse-hub-main) → Backend (this file) → RAG Service (RAG18Nov2025-1)
 * - All requests are validated here before forwarding to RAG
 * - Error handling ensures graceful degradation if RAG is unavailable
 */

import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { LoggerUtil } from '../utils/logger.util';

const router = Router();

// Get configuration from environment
const RAG_ENABLED = process.env.RAG_ENABLE === 'true';
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

// Create axios client for RAG service
const ragClient = axios.create({
  baseURL: RAG_SERVICE_URL,
  timeout: 30000, // 30 second timeout
});

/**
 * Middleware: Check if RAG is enabled
 */
const checkRAGEnabled = (req: Request, res: Response, next: Function) => {
  if (!RAG_ENABLED) {
    LoggerUtil.warn('[RAG Settings] RAG service is not enabled');
    return res.status(503).json({
      error: 'RAG service is not enabled',
      message: 'RAG settings management is disabled. Set RAG_ENABLE=true to enable.',
      statusCode: 503,
    });
  }
  next();
};

/**
 * Handle errors from RAG service
 */
const handleRAGError = (error: any, res: Response) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      LoggerUtil.error('[RAG Settings] RAG service connection failed', error);
      return res.status(503).json({
        error: 'RAG service unavailable',
        message: `Could not connect to RAG service at ${RAG_SERVICE_URL}. Is it running?`,
        statusCode: 503,
      });
    }

    if (axiosError.code === 'ECONNABORTED') {
      LoggerUtil.error('[RAG Settings] RAG service request timeout', error);
      return res.status(504).json({
        error: 'RAG service timeout',
        message: 'RAG service took too long to respond. Please try again.',
        statusCode: 504,
      });
    }

    if (axiosError.response) {
      // RAG service returned an error response
      LoggerUtil.error('[RAG Settings] RAG service error', {
        status: axiosError.response.status,
        data: axiosError.response.data,
      });

      const responseData = axiosError.response.data as any;
      return res.status(axiosError.response.status).json({
        error: 'RAG service error',
        message: responseData?.detail || responseData?.message || 'Unknown error from RAG service',
        statusCode: axiosError.response.status,
      });
    }
  }

  // Generic error
  LoggerUtil.error('[RAG Settings] Unexpected error', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    statusCode: 500,
  });
};

/**
 * GET /api/rag/settings/config
 * Get all RAG settings in one call
 * Useful for initial page load
 */
router.get('/rag/settings/config', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    LoggerUtil.debug('[RAG Settings] GET /api/settings/config');

    const response = await ragClient.get('/api/settings/config');

    if (response.status >= 400) {
      return handleRAGError(response as any, res);
    }

    res.json(response.data);
  } catch (error) {
    LoggerUtil.error('[RAG Settings] Error fetching config:', error);
    handleRAGError(error as AxiosError, res);
  }
});

/**
 * POST /api/rag/settings/model
 * Update LLM model
 */
router.post('/rag/settings/model', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { model_id } = req.body;

    if (!model_id || typeof model_id !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'model_id is required and must be a string',
      });
    }

    LoggerUtil.debug(`[RAG Settings] POST /api/settings/model (${model_id})`);

    const response = await ragClient.post('/api/settings/model', { model_id });

    if (response.status >= 400) {
      return handleRAGError(response as any, res);
    }

    res.json(response.data);
  } catch (error) {
    LoggerUtil.error('[RAG Settings] Error updating model:', error);
    handleRAGError(error as AxiosError, res);
  }
});

/**
 * POST /api/rag/settings/temperature
 * Update LLM temperature
 */
router.post('/rag/settings/temperature', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { temperature } = req.body;

    if (temperature === undefined || typeof temperature !== 'number') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'temperature is required and must be a number',
      });
    }

    if (temperature < 0.0 || temperature > 2.0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'temperature must be between 0.0 and 2.0',
      });
    }

    LoggerUtil.debug(`[RAG Settings] POST /api/settings/temperature (${temperature})`);

    const response = await ragClient.post('/api/settings/temperature', { temperature });

    if (response.status >= 400) {
      return handleRAGError(response as any, res);
    }

    res.json(response.data);
  } catch (error) {
    LoggerUtil.error('[RAG Settings] Error updating temperature:', error);
    handleRAGError(error as AxiosError, res);
  }
});

/**
 * POST /api/rag/settings/embedding
 * Update embedding model
 */
router.post('/rag/settings/embedding', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { embedding_model } = req.body;

    if (!embedding_model || typeof embedding_model !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'embedding_model is required and must be a string',
      });
    }

    LoggerUtil.debug(`[RAG Settings] POST /api/settings/embedding (${embedding_model})`);

    const response = await ragClient.post('/api/settings/embedding', { embedding_model });

    if (response.status >= 400) {
      return handleRAGError(response as any, res);
    }

    res.json(response.data);
  } catch (error) {
    LoggerUtil.error('[RAG Settings] Error updating embedding model:', error);
    handleRAGError(error as AxiosError, res);
  }
});

/**
 * POST /api/rag/settings/retrieval
 * Update retrieval settings (top-k)
 */
router.post('/rag/settings/retrieval', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { top_k } = req.body;

    if (top_k === undefined || typeof top_k !== 'number') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'top_k is required and must be a number',
      });
    }

    if (top_k < 5 || top_k > 100) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'top_k must be between 5 and 100',
      });
    }

    LoggerUtil.debug(`[RAG Settings] POST /api/settings/retrieval (${top_k})`);

    const response = await ragClient.post('/api/settings/retrieval', { top_k });

    if (response.status >= 400) {
      return handleRAGError(response as any, res);
    }

    res.json(response.data);
  } catch (error) {
    LoggerUtil.error('[RAG Settings] Error updating retrieval settings:', error);
    handleRAGError(error as AxiosError, res);
  }
});

/**
 * POST /api/rag/settings/prompts
 * Update custom prompts
 */
router.post('/rag/settings/prompts', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { custom_prompt, quiz_prompt } = req.body;

    // Both can be null/undefined, but if provided must be strings
    if (custom_prompt !== undefined && typeof custom_prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'custom_prompt must be a string',
      });
    }

    if (quiz_prompt !== undefined && typeof quiz_prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'quiz_prompt must be a string',
      });
    }

    LoggerUtil.debug('[RAG Settings] POST /api/settings/prompts');

    const response = await ragClient.post('/api/settings/prompts', {
      custom_prompt,
      quiz_prompt,
    });

    if (response.status >= 400) {
      return handleRAGError(response as any, res);
    }

    res.json(response.data);
  } catch (error) {
    LoggerUtil.error('[RAG Settings] Error updating prompts:', error);
    handleRAGError(error as AxiosError, res);
  }
});

/**
 * POST /api/rag/settings/offline
 * Update offline mode settings
 */
router.post('/rag/settings/offline', checkRAGEnabled, async (req: Request, res: Response) => {
  try {
    const { offline_mode, lm_studio_url, lm_studio_model } = req.body;

    if (typeof offline_mode !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'offline_mode must be a boolean',
      });
    }

    if (lm_studio_url !== undefined && typeof lm_studio_url !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'lm_studio_url must be a string',
      });
    }

    if (lm_studio_model !== undefined && typeof lm_studio_model !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'lm_studio_model must be a string',
      });
    }

    LoggerUtil.debug(`[RAG Settings] POST /api/settings/offline (${offline_mode})`);

    const response = await ragClient.post('/api/settings/offline', {
      offline_mode,
      lm_studio_url,
      lm_studio_model,
    });

    if (response.status >= 400) {
      return handleRAGError(response as any, res);
    }

    res.json(response.data);
  } catch (error) {
    LoggerUtil.error('[RAG Settings] Error updating offline mode:', error);
    handleRAGError(error as AxiosError, res);
  }
});

export default router;
