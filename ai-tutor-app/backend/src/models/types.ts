/**
 * User types
 */
export type UserRole = 'ADMIN' | 'EDUCATOR' | 'STUDENT';

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActivated: boolean;
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
  lastLoginAt?: number; // Unix milliseconds
  profileImageUrl?: string; // From Cognito
  bio?: string;
  phone?: string;
  profilePicture?: string;
  profilePictureUrl?: string; // S3 URL to profile picture
  profilePictureKey?: string; // S3 key for management
}

/**
 * Lecturer/Educator types
 */
export interface Lecturer {
  lecturerId: string;
  userId: string; // FK to Users (required after activation)
  staffNumber: string; // Unique identifier
  email: string; // Indexed, required
  firstName: string;
  lastName: string;
  title?: string; // Mr, Ms, Mrs, Dr, Prof
  departmentId: string; // FK to Departments (required)
  campusId: string; // FK to Campuses (required)
  moduleIds: string[]; // Modules taught
  registrationStatus: 'PENDING' | 'ACTIVATED' | 'DEACTIVATED';
  activatedAt?: number; // Unix milliseconds, when registered
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
  phone?: string;
  officeLocation?: string;
  bio?: string;
}

/**
 * Student types
 */
export interface Student {
  studentId: string;
  userId: string; // FK to Users (required after activation)
  studentNumber: string; // Unique identifier
  email: string; // Indexed, required
  firstName: string;
  lastName: string;
  title?: string; // Mr, Ms, Mrs, Dr, Prof
  departmentId: string; // FK to Departments (required)
  campusId: string; // FK to Campuses (required)
  courseId?: string; // FK to Courses (optional - primary course)
  moduleIds: string[]; // Enrolled modules
  enrollmentYear: number; // Year of enrollment (e.g., 2024)
  registrationStatus: 'PENDING' | 'ACTIVATED' | 'DEACTIVATED';
  activatedAt?: number; // Unix milliseconds, when registered
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
  phone?: string;
}

/**
 * Module types
 */
export type ModuleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Module {
  moduleId: string;
  moduleName: string; // Required, human-readable name
  moduleCode: string; // Course code (unique)
  description: string;
  lecturerIds?: string[]; // Multiple lecturers can teach module (optional - managed by Lecturer table)
  courseId?: string; // FK to Courses (optional)
  status: ModuleStatus;
  departmentId?: string; // FK to Departments (optional)
  studentCount: number; // Count of enrolled students
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
}

/**
 * File types
 */
export type FileStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface File {
  fileId: string;
  fileName: string;
  fileType: 'PDF' | 'DOCX' | 'PPTX' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'CODE' | 'OTHER';
  fileSize: number;
  lecturerId: string; // Who uploaded it (indexed)
  moduleId: string; // Module it belongs to (indexed with uploadedAt)
  s3Key: string;
  s3Bucket: string;
  mimeType: string;
  uploadedAt: number; // Unix milliseconds (indexed)
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
  status: FileStatus;
  description?: string;
  title?: string; // File title/name for display
  contentType?: string; // Content type category (lecture-notes, assignments, etc)
  author?: string; // Author/uploader name
  ttl?: number; // Unix milliseconds for auto-deletion (90 days)
  accessLevel?: string; // MODULE_ONLY, DEPARTMENT, UNIVERSITY, PUBLIC
  isPublished?: boolean;
  tags?: string[];
  duration?: number;
  pages?: number;

  // RAG Integration fields
  ragDocumentId?: string | null; // Document ID returned by RAG service
  ragProcessingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  ragChunkCount?: number; // Number of chunks created by RAG
  ragProcessedAt?: number; // Unix milliseconds when RAG processing completed
  ragError?: string | null; // Error message if RAG processing failed
}

/**
 * Chat types
 */
export interface ChatSession {
  sessionId: string; // Not chatSessionId
  studentId: string; // FK to Students
  moduleId?: string; // Optional module context
  contentIds?: string[]; // Selected content for context
  title: string;
  messageCount?: number; // Count of messages in session
  createdAt: string; // ISO 8601 timestamp (for GSI compatibility)
  updatedAt: string; // ISO 8601 timestamp (for GSI compatibility)
  ttl: number; // Unix milliseconds for auto-deletion (90 days from creation)
}

export interface ChatMessage {
  messageId: string;
  sessionId: string; // Not chatSessionId
  role: 'user' | 'assistant';
  content: string;
  createdAt: string; // ISO 8601 timestamp (for GSI compatibility)
}

/**
 * Quiz types
 */
export interface Quiz {
  quizId: string;
  moduleId: string;
  contentIds?: string[]; // Selected content for quiz generation
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
}

export interface QuizQuestion {
  questionId: string;
  question: string;
  type: 'single-select' | 'multi-select' | 'fill-blank' | 'true-false';
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  points: number;
}

/**
 * Audit log types
 */
export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'MODULE_CREATED'
  | 'MODULE_UPDATED'
  | 'MODULE_DELETED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'QUIZ_GENERATED'
  | 'CHAT_INITIATED';

export interface AuditLog {
  auditLogId: string;
  action: AuditAction;
  userId: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number; // Unix milliseconds
}

/**
 * Supporting Table Types
 */
export interface Department {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  description?: string;
  facultyId?: string;
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
}

export interface Faculty {
  facultyId: string;
  facultyName: string;
  facultyCode: string;
  description?: string;
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
}

export interface Course {
  courseId: string;
  courseCode: string;
  courseName: string;
  departmentId: string;
  duration?: number;
  credits?: number;
  description?: string;
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
}

export interface Campus {
  campusId: string;
  campusName: string;
  campusCode: string;
  location?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
  createdBy: string;
}

export interface Summary {
  summaryId: string;
  moduleId: string;
  studentId: string;
  contentIds: string[];
  title: string;
  content: string;
  createdAt: number; // Unix milliseconds
  updatedAt: number; // Unix milliseconds
}

/**
 * API Request/Response types
 */
export interface ApiRequest {
  userId?: string;
  role?: UserRole;
  requestId: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * RAG Service types
 */
export interface RagChatRequest {
  question: string;
  documentIds: string[];
  chatHistory?: Array<{ role: string; content: string }>;
}

export interface RagChatResponse {
  success: boolean;
  answer: string;
  document_ids_used: string[];
  chunks_used: number;
  response_time: number;
  used_course_materials: boolean;
}

export interface RagQuizRequest {
  moduleId: string;
  contentId: string;
  documentIds: string[];
  numQuestions?: number;
  title?: string;
  questionTypes?: string[];
}

export interface RagQuizQuestion {
  type: 'multiple-choice' | 'true-false';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface RagQuizResponse {
  quiz: {
    id: string;
    title: string;
    moduleId: string;
    contentId: string;
    questions: RagQuizQuestion[];
  };
}
