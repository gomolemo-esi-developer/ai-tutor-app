import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  // General
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  NODE_ENV: string;

  // AWS
  AWS_REGION: string;
  AWS_ACCOUNT_ID: string;

  // DynamoDB
  DYNAMODB_TABLE_PREFIX: string;
  DYNAMODB_ENDPOINT?: string;

  // S3
  S3_BUCKET: string;

  // Cognito
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_REGION: string;

  // JWT
  JWT_SECRET: string;

  // AI
  AI_API_PROVIDER: 'claude' | 'openai';
  AI_API_KEY: string;

  // CORS
  CORS_ORIGIN: string;

  // Server (for local dev)
  PORT: number;
  HOST: string;

  // Frontend URL (for quick links)
  FRONTEND_URL: string;

  // Encryption
  ENCRYPTION_KEY?: string;

  // RAG Service Integration
  RAG_SERVICE_URL?: string;
  RAG_API_KEY?: string;
  RAG_ENABLE: string;
  RAG_TIMEOUT: string;
  RAG_RETRY_ATTEMPTS: string;
  RAG_RETRY_DELAY_MS: string;
}

export class EnvConfig {
  private static config: EnvironmentConfig | null = null;

  static getConfig(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    this.config = {
      ENVIRONMENT: process.env.ENVIRONMENT || 'development',
      LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
      NODE_ENV: process.env.NODE_ENV || 'development',

      AWS_REGION: process.env.AWS_REGION || 'us-east-2',
      AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID || '',

      DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX || 'aitutor',
      DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,

      S3_BUCKET: process.env.S3_BUCKET || '',
      COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || '',
      COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || '',
      COGNITO_REGION: process.env.COGNITO_REGION || 'us-east-2',

      JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',

      AI_API_PROVIDER: (process.env.AI_API_PROVIDER || 'claude') as 'claude' | 'openai',
      AI_API_KEY: process.env.AI_API_KEY || '',

      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

      PORT: parseInt(process.env.PORT || '3000', 10),
      HOST: process.env.HOST || 'localhost',

      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

      // RAG Service
      RAG_SERVICE_URL: process.env.RAG_SERVICE_URL,
      RAG_API_KEY: process.env.RAG_API_KEY,
      RAG_ENABLE: process.env.RAG_ENABLE || 'false',
      RAG_TIMEOUT: process.env.RAG_TIMEOUT || '30000',
      RAG_RETRY_ATTEMPTS: process.env.RAG_RETRY_ATTEMPTS || '3',
      RAG_RETRY_DELAY_MS: process.env.RAG_RETRY_DELAY_MS || '1000',
    };

    this.validateRequired();
    return this.config;
  }

  private static validateRequired() {
    if (!this.config) {
      throw new Error('Config not initialized');
    }

    const required: (keyof EnvironmentConfig)[] = [
      'AWS_REGION',
      'S3_BUCKET',
      'COGNITO_USER_POOL_ID',
      'COGNITO_CLIENT_ID',
    ];

    for (const key of required) {
      if (!this.config[key]) {
        console.warn(`Missing required environment variable: ${key}`);
      }
    }
  }

  static get(key: keyof EnvironmentConfig): any {
    return this.getConfig()[key];
  }

  static isDevelopment(): boolean {
    return this.getConfig().ENVIRONMENT === 'development';
  }

  static isProduction(): boolean {
    return this.getConfig().ENVIRONMENT === 'production';
  }

  static isStaging(): boolean {
    return this.getConfig().ENVIRONMENT === 'staging';
  }
}
