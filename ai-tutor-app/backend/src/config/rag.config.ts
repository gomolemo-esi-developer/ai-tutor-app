/**
 * RAG Service Configuration
 * Reads environment variables and provides configuration to RAGService
 */

export class RAGConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly apiKey?: string;
  readonly enabled: boolean;
  readonly retryAttempts: number;
  readonly retryDelayMs: number;

  constructor(
    baseUrl: string,
    timeout: number = 900000, // 15 minutes - allow time for video transcription with Whisper
    apiKey?: string,
    enabled: boolean = true,
    retryAttempts: number = 3,
    retryDelayMs: number = 2000
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.apiKey = apiKey;
    this.enabled = enabled && !!baseUrl;
    this.retryAttempts = Math.max(1, retryAttempts);
    this.retryDelayMs = Math.max(100, retryDelayMs);

    if (this.enabled) {
      console.log(`[RAG CONFIG] Service enabled: ${this.baseUrl} (${this.timeout}ms timeout, ${this.retryAttempts} retries)`);
    } else {
      console.log('[RAG CONFIG] Service disabled - will use fallback');
    }
  }

  /**
   * Check if RAG service is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create config from environment variables
   */
  static fromEnv(): RAGConfig {
    const baseUrl = process.env.RAG_SERVICE_URL || '';
    const timeout = parseInt(process.env.RAG_TIMEOUT || '900000', 10); // 15 minutes default
    const apiKey = process.env.RAG_API_KEY;
    const enabled = process.env.RAG_ENABLE !== 'false';
    const retryAttempts = parseInt(process.env.RAG_RETRY_ATTEMPTS || '3', 10);
    const retryDelayMs = parseInt(process.env.RAG_RETRY_DELAY_MS || '2000', 10);

    return new RAGConfig(
      baseUrl,
      timeout,
      apiKey,
      enabled,
      retryAttempts,
      retryDelayMs
    );
  }

  /**
   * Get config summary for logging
   */
  getSummary(): object {
    return {
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      hasApiKey: !!this.apiKey,
      retryAttempts: this.retryAttempts,
      retryDelayMs: this.retryDelayMs
    };
  }
}
