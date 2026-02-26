/**
 * RAG Service Client
 * Handles all communication with RAG18Nov2025-1 (FastAPI service)
 * Methods: uploadDocument, chat, generateQuiz, healthCheck
 */

import axios, { AxiosInstance } from 'axios';
import { LoggerUtil } from '../utils/logger.util';
import { RAGConfig } from '../config/rag.config';

export interface RAGUploadResponse {
    documentId: string;
    chunkCount: number;
    textLength: number;
    fileType: string;
    status: 'complete' | 'error';
    message?: string;
}

export interface RAGChatResponse {
    success: boolean;
    answer: string;
    document_ids_used: string[];
    chunks_used: number;
    response_time: number;
    used_course_materials: boolean;
}

export interface RAGQuizResponse {
    quiz: {
        id: string;
        title: string;
        moduleId: string;
        contentId: string;
        questions: Array<{
            type: 'multiple-choice' | 'true-false' | 'multi-select' | 'fill-blank';
            question: string;
            options?: string[];
            correctAnswer: string | string[];
            explanation?: string;
            points: number;
            questionId?: string;
        }>;
    };
}

export interface RAGChunk {
    index: number;
    chunk_id: string;
    text: string;
    length: number;
    metadata: Record<string, any>;
}

export interface RAGChunksResponse {
    document_id: string;
    total_chunks: number;
    chunks: RAGChunk[];
}

export class RAGService {
    private client: AxiosInstance;
    private config: RAGConfig;

    constructor(config: RAGConfig) {
        this.config = config;
        this.client = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
            }
        });
    }

    /**
     * Check if RAG service is enabled
     */
    isEnabled(): boolean {
        return this.config.isEnabled();
    }

    /**
     * Upload file to RAG service
     * Streams response with progress updates
     * 
     * FIX (2026-01-23): Added callbackUrl support for async status updates
     */
    async uploadDocument(
        file: Buffer,
        fileName: string,
        callbackUrl?: string
    ): Promise<RAGUploadResponse> {
        if (!this.config.isEnabled()) {
            throw new Error('RAG service not enabled');
        }

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const formData = new FormData();
                const blob = new Blob([file], { type: 'application/octet-stream' });
                formData.append('file', blob, fileName);

                LoggerUtil.info(`[RAG] Upload attempt ${attempt}/${this.config.retryAttempts}`, {
                    fileName,
                    fileSize: file.length,
                    hasCallback: !!callbackUrl
                });

                // Get last complete message from streaming response
                const uploadUrl = callbackUrl
                    ? `/educator/upload?callback_url=${encodeURIComponent(callbackUrl)}`
                    : '/educator/upload';

                // FIX (2026-02-19): Improve response handling for large video files
                // Use axios with extended timeout to allow video transcription
                // The timeout is already set in the axios instance, but we can override per request
                const response = await this.client.post(uploadUrl, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    // Override timeout for this specific request (use full 15 minutes)
                    timeout: Math.max(this.config.timeout, 15 * 60 * 1000),
                    // Don't throw on any status code - we'll handle errors in response parsing
                    validateStatus: () => true
                });

                // Parse ndjson response - response.data should be a string containing newline-delimited JSON
                const responseText = typeof response.data === 'string'
                    ? response.data
                    : JSON.stringify(response.data);

                const lines = responseText.split('\n').filter((l: string) => l.trim());
                if (lines.length === 0) {
                    throw new Error('RAG response is empty');
                }

                // Parse all lines and find the complete status
                let completeData: any = null;
                let lastError: string | null = null;

                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);

                        if (parsed.status === 'error') {
                            lastError = parsed.message || 'RAG upload failed';
                            continue;
                        }

                        // Track any line with document_id, but prefer 'complete' status
                        if (parsed.document_id) {
                            completeData = parsed;
                            LoggerUtil.info('[RAG] Processing status', {
                                status: parsed.status,
                                progress: parsed.progress
                            });

                            // Break on complete status
                            if (parsed.status === 'complete') {
                                break;
                            }
                        }
                    } catch (parseError) {
                        LoggerUtil.warn('[RAG] Failed to parse response line', {
                            line: line.substring(0, 100)
                        });
                    }
                }

                // If we got an error, throw it
                if (lastError && !completeData) {
                    throw new Error(lastError);
                }

                // Validate response structure
                if (!completeData || typeof completeData !== 'object') {
                    throw new Error('RAG response is not a valid object');
                }

                if (!completeData.document_id) {
                    throw new Error(`RAG response missing document_id - final status was: ${completeData.status}`);
                }

                if (completeData.status === 'error') {
                    throw new Error(completeData.message || 'RAG upload failed');
                }

                // Validate chunk count
                if (completeData.chunks === undefined || completeData.chunks === null) {
                    throw new Error('RAG response missing chunk count');
                }

                if (typeof completeData.chunks !== 'number' || completeData.chunks < 0) {
                    throw new Error(`RAG response has invalid chunk count: ${completeData.chunks}`);
                }

                LoggerUtil.info('[RAG] Upload successful', {
                    fileName,
                    documentId: completeData.document_id,
                    chunks: completeData.chunks,
                    textLength: completeData.text_length,
                    fileType: completeData.file_type
                });

                return {
                    documentId: completeData.document_id,
                    chunkCount: completeData.chunks,
                    textLength: completeData.text_length || 0,
                    fileType: completeData.file_type || 'unknown',
                    status: 'complete'
                };
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                LoggerUtil.warn(`[RAG] Upload failed (attempt ${attempt}/${this.config.retryAttempts})`, {
                    fileName,
                    error: errorMsg,
                    fileSize: file.length
                });

                if (attempt < this.config.retryAttempts) {
                    // Exponential backoff with longer delays for stream errors
                    // Stream abort typically means RAG service is still processing
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    LoggerUtil.info(`[RAG] Retrying in ${delay}ms`, { fileName });
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    LoggerUtil.error(`[RAG] Upload failed after ${this.config.retryAttempts} attempts`, {
                        fileName,
                        lastError: errorMsg
                    });
                    throw error;
                }
            }
        }

        throw new Error('RAG upload failed after all retries');
    }

    /**
     * Chat with RAG (context-aware Q&A)
     */
    async chat(
        question: string,
        documentIds: string[],
        chatHistory?: Array<{ role: string; content: string }>
    ): Promise<RAGChatResponse> {
        if (!this.config.isEnabled()) {
            throw new Error('RAG service not enabled');
        }

        if (!documentIds || documentIds.length === 0) {
            throw new Error('At least one document ID required for RAG chat');
        }

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                LoggerUtil.info(`[RAG] Chat attempt ${attempt}/${this.config.retryAttempts}`, {
                    questionLength: question.length,
                    documentCount: documentIds.length
                });

                const response = await this.client.post('/student/chat', {
                    question,
                    document_ids: documentIds,
                    chat_history: chatHistory || []
                });

                LoggerUtil.info('[RAG] Chat response received', {
                    responseTime: response.data.response_time,
                    chunksUsed: response.data.chunks_used
                });

                return response.data;
            } catch (error) {
                LoggerUtil.warn(`[RAG] Chat failed (attempt ${attempt}/${this.config.retryAttempts})`, {
                    error: error instanceof Error ? error.message : String(error)
                });

                if (attempt < this.config.retryAttempts) {
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }

        throw new Error('RAG chat failed after all retries');
    }

    /**
     * Generate a descriptive title for a chat based on conversation content
     */
    async generateChatTitle(messageText: string, moduleCode?: string): Promise<string> {
        if (!this.config.isEnabled()) {
            throw new Error('RAG service not enabled');
        }

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                LoggerUtil.info(`[RAG] Generating chat title (attempt ${attempt}/${this.config.retryAttempts})`, {
                    moduleCode,
                    messageLength: messageText.length
                });

                const response = await this.client.post('/student/generate-title', {
                    message: messageText,
                    module: moduleCode
                });

                const title = response.data?.title || response.data?.success;

                if (!title) {
                    throw new Error('No title returned from RAG service');
                }

                LoggerUtil.info('[RAG] Chat title generated', { title });
                return String(title);
            } catch (error) {
                LoggerUtil.warn(`[RAG] Title generation failed (attempt ${attempt}/${this.config.retryAttempts})`, {
                    error: error instanceof Error ? error.message : String(error)
                });

                if (attempt < this.config.retryAttempts) {
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }

        throw new Error('RAG title generation failed after all retries');
    }

    /**
     * Generate quiz from documents
     */
    async generateQuiz(
        moduleId: string,
        contentId: string,
        documentIds: string[],
        numQuestions: number = 5,
        title?: string
    ): Promise<RAGQuizResponse> {
        if (!this.config.isEnabled()) {
            throw new Error('RAG service not enabled');
        }

        if (!documentIds || documentIds.length === 0) {
            throw new Error('At least one document ID required for quiz generation');
        }

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                LoggerUtil.info(`[RAG] Quiz attempt ${attempt}/${this.config.retryAttempts}`, {
                    moduleId,
                    contentId,
                    numQuestions,
                    documentCount: documentIds.length
                });

                const response = await this.client.post('/quiz/generate', {
                    moduleId,
                    contentId,
                    documentIds,
                    numQuestions,
                    title: title || `Quiz for ${contentId}`,
                    questionTypes: ['single-select', 'multi-select', 'fill-blank', 'true-false']
                });

                LoggerUtil.info('[RAG] Quiz generated', {
                    quizId: response.data.quiz?.id,
                    questionCount: response.data.quiz?.questions?.length
                });

                return response.data;
            } catch (error) {
                LoggerUtil.warn(`[RAG] Quiz generation failed (attempt ${attempt}/${this.config.retryAttempts})`, {
                    error: error instanceof Error ? error.message : String(error)
                });

                if (attempt < this.config.retryAttempts) {
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }

        throw new Error('RAG quiz generation failed after all retries');
    }

    /**
     * Get chunks for a document
     */
    async getDocumentChunks(
        documentId: string,
        limit: number = 100
    ): Promise<RAGChunksResponse> {
        if (!this.config.isEnabled()) {
            throw new Error('RAG service not enabled');
        }

        try {
            LoggerUtil.info('[RAG] Fetching document chunks', {
                documentId,
                limit
            });

            const response = await this.client.get(
                `/educator/chunks/${documentId}`,
                { params: { limit } }
            );

            LoggerUtil.info('[RAG] Document chunks retrieved', {
                documentId,
                chunkCount: response.data.total_chunks
            });

            return response.data;
        } catch (error) {
            LoggerUtil.warn('[RAG] Failed to fetch document chunks', {
                documentId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Delete document from RAG (removes chunks from Chroma DB)
     */
    async deleteDocument(documentId: string): Promise<void> {
        if (!this.config.isEnabled()) {
            LoggerUtil.warn('[RAG] Service not enabled, skipping delete', { documentId });
            return;
        }

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                LoggerUtil.info(`[RAG] Delete document attempt ${attempt}/${this.config.retryAttempts}`, {
                    documentId
                });

                await this.client.delete(`/educator/documents/${documentId}`);

                LoggerUtil.info('[RAG] Document deleted from RAG', { documentId });
                return;
            } catch (error) {
                LoggerUtil.warn(`[RAG] Delete document failed (attempt ${attempt}/${this.config.retryAttempts})`, {
                    documentId,
                    error: error instanceof Error ? error.message : String(error)
                });

                if (attempt < this.config.retryAttempts) {
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    LoggerUtil.error('[RAG] Failed to delete document after all retries', {
                        documentId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }
    }

    /**
      * Health check
      */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/health/', { timeout: 5000 });
            const isHealthy = response.status === 200;
            LoggerUtil.info('[RAG] Health check', { status: isHealthy });
            return isHealthy;
        } catch (error) {
            LoggerUtil.warn('[RAG] Health check failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
}

// Singleton instance
let ragService: RAGService | null = null;

/**
 * Get or initialize RAG service
 */
export function getRagService(): RAGService {
    if (!ragService) {
        const { RAGConfig } = require('../config/rag.config');
        const config = RAGConfig.fromEnv();
        ragService = new RAGService(config);
    }
    return ragService;
}

/**
 * Initialize RAG service with custom config (for testing)
 */
export function initRagService(config: RAGConfig): void {
    ragService = new RAGService(config);
}

/**
 * Reset RAG service (for testing)
 */
export function resetRagService(): void {
    ragService = null;
}
