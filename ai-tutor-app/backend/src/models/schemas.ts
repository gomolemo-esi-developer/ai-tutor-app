import { z } from 'zod';

/**
 * Auth schemas
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  role: z.enum(['ADMIN', 'EDUCATOR', 'STUDENT']),
  staffNumber: z.string().min(1, 'Staff number required for educators').optional(),
  studentNumber: z.string().min(1, 'Student number required for students').optional(),
  departmentId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number').optional(),
  profileImageUrl: z.string().url().optional(),
  bio: z.string().optional(),
  profilePicture: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
});

/**
 * Lecturer schemas - Phase 3B (Activation flow)
 */
export const createLecturerSchema = z.object({
  staffNumber: z.string().min(1, 'Staff number required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  title: z.enum(['Mr', 'Ms', 'Mrs', 'Dr', 'Prof']).optional(),
  departmentId: z.string().min(1, 'Department ID required'),
  campusId: z.string().min(1, 'Campus ID required'),
  moduleIds: z.array(z.string()).default([]),
  phone: z.string().optional(),
  officeLocation: z.string().optional(),
  bio: z.string().optional(),
});

export const updateLecturerSchema = createLecturerSchema.partial();

/**
 * Student schemas - Phase 3B (Activation flow)
 */
export const createStudentSchema = z.object({
  studentNumber: z.string().min(1, 'Student number required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  title: z.enum(['Mr', 'Ms', 'Mrs', 'Dr', 'Prof']).optional(),
  departmentId: z.string().min(1, 'Department ID required'),
  campusId: z.string().min(1, 'Campus ID required'),
  enrollmentYear: z.number().min(1900, 'Invalid enrollment year'),
  moduleIds: z.array(z.string()).default([]),
  phone: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

/**
 * Module schemas
 */
export const createModuleSchema = z.object({
  moduleName: z.string().min(3, 'Module name must be at least 3 characters'),
  moduleCode: z.string().min(2, 'Module code required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  departmentId: z.string().optional(),
  courseId: z.string().optional(),
  lecturerIds: z.array(z.string()).optional().default([]),
});

export const updateModuleSchema = createModuleSchema.partial();

/**
 * File schemas
 */
export const uploadFileSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(['PDF', 'DOCX', 'PPTX', 'IMAGE', 'VIDEO', 'AUDIO', 'CODE', 'OTHER']),
  fileSize: z.number().min(1).max(500 * 1024 * 1024), // 500MB max
  mimeType: z.string().min(1),
  moduleId: z.string().min(1, 'Module ID required'),
  description: z.string().optional(),
});

/**
 * File Metadata Schemas
 */
export const createFileMetadataSchema = z.object({
  fileName: z.string().min(1, 'File name required').max(255, 'File name too long'),
  fileType: z.enum(['PDF', 'DOCX', 'PPTX', 'VIDEO', 'IMAGE', 'AUDIO', 'CODE', 'OTHER']),
  fileSize: z.number().min(1, 'File size must be greater than 0').max(500 * 1024 * 1024, 'File size cannot exceed 500MB'),
  mimeType: z.string().min(1, 'MIME type required').max(100),
  moduleId: z.string().min(1, 'Invalid module ID'),
  lecturerId: z.string().min(1, 'Invalid lecturer ID'),
  description: z.string().max(1000, 'Description too long').optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).default('ACTIVE'),
  tags: z.array(z.string().min(1).max(50)).default([]),
  duration: z.number().min(0).optional(), // For video/audio in seconds
  pages: z.number().min(1).optional(), // For PDF documents
});

export const updateFileMetadataSchema = z.object({
  description: z.string().max(1000).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const updateEducatorFileMetadataSchema = z.object({
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const bulkUploadFilesSchema = z.object({
  files: z.array(createFileMetadataSchema).min(1, 'At least one file required').max(100, 'Maximum 100 files per bulk upload'),
});

/**
 * Chat schemas
 */
export const sendChatMessageSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  message: z.string().min(1).max(5000),
});

export const createChatSessionSchema = z.object({
  title: z.string().min(1, 'Title required'),
  moduleId: z.string().min(1, 'Module ID required').optional(),
  contentIds: z.array(z.string()).optional(),
});

/**
 * Quiz schemas
 */
export const generateQuizSchema = z.object({
  moduleId: z.string().min(1),
  contentIds: z.array(z.string()).optional(),
  numQuestions: z.number().min(1).max(50),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

/**
 * Supporting Table Schemas
 */
export const createDepartmentSchema = z.object({
  departmentName: z.string().min(2, 'Department name required'),
  departmentCode: z.string().min(1, 'Department code required'),
  description: z.string().optional(),
  facultyId: z.string().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createFacultySchema = z.object({
  facultyName: z.string().min(2, 'Faculty name required'),
  facultyCode: z.string().min(1, 'Faculty code required'),
  description: z.string().optional(),
});

export const updateFacultySchema = createFacultySchema.partial();

export const createCourseSchema = z.object({
  courseCode: z.string().min(1, 'Course code required'),
  courseName: z.string().min(2, 'Course name required'),
  departmentId: z.string().min(1, 'Department ID required'),
  duration: z.number().min(1, 'Duration required').optional(),
  credits: z.number().min(0, 'Credits must be non-negative').optional(),
  description: z.string().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createCampusSchema = z.object({
  campusName: z.string().min(2, 'Campus name required'),
  campusCode: z.string().min(1, 'Campus code required'),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const updateCampusSchema = createCampusSchema.partial();

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});

// Type exports for convenience
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateLecturerInput = z.infer<typeof createLecturerSchema>;
export type UpdateLecturerInput = z.infer<typeof updateLecturerSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateCampusInput = z.infer<typeof createCampusSchema>;
export type UpdateCampusInput = z.infer<typeof updateCampusSchema>;
export type CreateFileMetadataInput = z.infer<typeof createFileMetadataSchema>;
export type UpdateFileMetadataInput = z.infer<typeof updateFileMetadataSchema>;
export type UpdateEducatorFileMetadataInput = z.infer<typeof updateEducatorFileMetadataSchema>;
export type BulkUploadFilesInput = z.infer<typeof bulkUploadFilesSchema>;
