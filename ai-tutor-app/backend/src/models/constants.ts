/**
 * Titles (Mr, Ms, Mrs, Dr, Prof)
 */
export const TITLES = {
  MR: 'Mr',
  MS: 'Ms',
  MRS: 'Mrs',
  DR: 'Dr',
  PROF: 'Prof',
} as const;

export const TITLE_OPTIONS = Object.values(TITLES);

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  EDUCATOR: 'EDUCATOR',
  STUDENT: 'STUDENT',
} as const;

/**
 * User statuses
 */
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  SUSPENDED: 'SUSPENDED',
} as const;

/**
 * Module statuses
 */
export const MODULE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

/**
 * File types
 */
export const FILE_TYPES = {
  PDF: 'PDF',
  DOCX: 'DOCX',
  PPTX: 'PPTX',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  OTHER: 'OTHER',
} as const;

/**
 * Audit actions
 */
export const AUDIT_ACTIONS = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  MODULE_CREATED: 'MODULE_CREATED',
  MODULE_UPDATED: 'MODULE_UPDATED',
  MODULE_DELETED: 'MODULE_DELETED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  QUIZ_GENERATED: 'QUIZ_GENERATED',
  CHAT_INITIATED: 'CHAT_INITIATED',
} as const;

/**
 * DynamoDB table names
 */
export const DYNAMODB_TABLES = {
  USERS: 'aitutor_users',
  LECTURERS: 'aitutor_lecturers',
  STUDENTS: 'aitutor_students',
  MODULES: 'aitutor_modules',
  FILES: 'aitutor_files',
  CHAT_SESSIONS: 'aitutor_chat_sessions',
  CHAT_MESSAGES: 'aitutor_chat_messages',
  QUIZZES: 'aitutor_quizzes',
  QUIZ_RESULTS: 'aitutor_quiz_results',
  AUDIT_LOGS: 'aitutor_audit_logs',
  NOTIFICATIONS: 'aitutor_notifications',
  SETTINGS: 'aitutor_settings',
  DEPARTMENTS: 'aitutor_departments',
  FACULTIES: 'aitutor_faculties',
  COURSES: 'aitutor_courses',
  CAMPUSES: 'aitutor_campuses',
  SUMMARIES: 'aitutor_summaries',
} as const;

/**
 * Global Secondary Index names
 */
export const GSI_NAMES = {
  USERS_BY_EMAIL: 'email_gsi',
  LECTURERS_BY_USER_ID: 'userId_gsi',
  STUDENTS_BY_USER_ID: 'userId_gsi',
  MODULES_BY_LECTURER_ID: 'lecturerId_gsi',
  MODULES_BY_CODE: 'moduleCode-index',
  FILES_BY_MODULE_ID: 'moduleId_gsi',
  CHAT_SESSIONS_BY_USER_ID: 'userId_gsi',
  QUIZZES_BY_MODULE_ID: 'moduleId_gsi',
  AUDIT_LOGS_BY_USER_ID: 'userId_gsi',
  NOTIFICATIONS_BY_USER_ID: 'userId_gsi',
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_EXISTS: 'USER_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Rate limiting
 */
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_REQUESTS_PER_HOUR: 1000,
  FILE_UPLOADS_PER_HOUR: 100,
} as const;

/**
 * Token expiry times
 */
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 3600, // 1 hour in seconds
  REFRESH_TOKEN: 604800, // 7 days in seconds
  PASSWORD_RESET: 1800, // 30 minutes in seconds
  EMAIL_VERIFICATION: 86400, // 24 hours in seconds
} as const;

/**
 * File upload limits
 */
export const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024 * 1024, // 5GB
  MAX_FILENAME_LENGTH: 255,
  ALLOWED_TYPES: ['PDF', 'DOCX', 'PPTX', 'IMAGE', 'VIDEO', 'AUDIO'],
  TEMP_FILE_TTL: 24 * 60 * 60, // 24 hours in seconds
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Environment values
 */
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;
