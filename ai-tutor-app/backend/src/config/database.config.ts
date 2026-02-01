import { EnvConfig } from './environment';
import { DYNAMODB_TABLES } from '../models/constants';

/**
 * Database configuration and table name management
 */
export class DatabaseConfig {
  private static tablePrefix: string;

  static initialize() {
    this.tablePrefix = EnvConfig.get('DYNAMODB_TABLE_PREFIX');
  }

  /**
   * Get full table name with prefix
   */
  static getTableName(baseName: string): string {
    let prefix = EnvConfig.get('DYNAMODB_TABLE_PREFIX');
    // Remove trailing underscore if present
    prefix = prefix.endsWith('_') ? prefix.slice(0, -1) : prefix;
    return `${prefix}_${baseName}`;
  }

  /**
   * Get all configured table names
   */
  static getTables() {
    return {
      USERS: this.getTableName('users'),
      LECTURERS: this.getTableName('lecturers'),
      STUDENTS: this.getTableName('students'),
      MODULES: this.getTableName('modules'),
      FILES: this.getTableName('files'),
      CHAT_SESSIONS: this.getTableName('chat_sessions'),
      CHAT_MESSAGES: this.getTableName('chat_messages'),
      QUIZZES: this.getTableName('quizzes'),
      QUIZ_RESULTS: this.getTableName('quiz_results'),
      AUDIT_LOGS: this.getTableName('audit_logs'),
      NOTIFICATIONS: this.getTableName('notifications'),
      SETTINGS: this.getTableName('settings'),
      DEPARTMENTS: this.getTableName('departments'),
      FACULTIES: this.getTableName('faculties'),
      COURSES: this.getTableName('courses'),
      CAMPUSES: this.getTableName('campuses'),
      SUMMARIES: this.getTableName('summaries'),
      VERIFICATION_CODES: this.getTableName('verification_codes'),
      QUICK_LINKS: this.getTableName('quick_links'),
    };
  }

  /**
   * DynamoDB query retry configuration
   */
  static getRetryConfig() {
    return {
      maxAttempts: 3,
      initialDelayMs: 50,
      maxDelayMs: 5000,
    };
  }

  /**
   * DynamoDB batch write configuration
   */
  static getBatchConfig() {
    return {
      maxBatchSize: 25, // DynamoDB limit
      maxRetries: 3,
    };
  }

  /**
   * Query pagination defaults
   */
  static getPaginationDefaults() {
    return {
      pageSize: 10,
      maxPageSize: 100,
    };
  }

  /**
   * TTL configuration for tables
   */
  static getTTLConfig() {
    return {
      AUDIT_LOGS: 90 * 24 * 60 * 60, // 90 days
      CHAT_SESSIONS: 30 * 24 * 60 * 60, // 30 days
      TEMP_FILES: 24 * 60 * 60, // 24 hours
    };
  }

  /**
   * Capacity configuration
   */
  static getCapacityConfig() {
    const isDev = EnvConfig.isDevelopment();
    return {
      mode: 'PAY_PER_REQUEST', // On-demand
      readCapacity: isDev ? 5 : 100,
      writeCapacity: isDev ? 5 : 100,
    };
  }

  /**
   * Global Secondary Index configuration
   */
  static getGSIConfig() {
    return {
      projectionType: 'ALL',
      capacityMode: 'PAY_PER_REQUEST',
    };
  }

  /**
   * Stream configuration
   */
  static getStreamConfig() {
    return {
      enabled: true,
      viewType: 'NEW_AND_OLD_IMAGES',
    };
  }
}

// Initialize on module load
DatabaseConfig.initialize();
