// ==================== Enums ====================
export enum UserRoleEnum {
  STUDENT = 'student',
  EDUCATOR = 'educator',
  ADMIN = 'admin'
}

export type UserRole = 'student' | 'educator' | 'admin';

// ==================== User ====================
export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  profile?: {
    firstName: string;
    lastName: string;
  };
  createdAt?: number;
  updatedAt?: number;
}

// ==================== Student ====================
export interface Student {
  studentId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  enrollmentNumber: string;
  academicLevel?: string;
  departmentId: string;
  campus?: string;
  enrolledModuleIds?: string[];
  enrollmentStatus?: string;
  gpa?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Educator/Lecturer ====================
export interface Educator {
  educatorId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  specialization: string;
  educationLevel?: string;
  yearsExperience?: number;
  officeLocation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lecturer extends Educator {
  staffNumber?: string;
  moduleCode?: string;
  moduleName?: string;
  taughtModules?: string[];
  title?: string;
  moduleIds?: string[];
  campusId?: string;
  campus?: string;
  registrationStatus?: string;
  name?: string;
  surname?: string;
  id?: string;
  educatorId?: string;
}

// ==================== Module ====================
export interface Module {
  moduleId: string;
  code: string;
  name: string;
  description?: string;
  departmentId: string;
  courseId?: string;
  credits?: number;
  status?: string;
  createdAt?: string;
}

// ==================== Course ====================
export interface Course {
  courseId: string;
  code?: string;
  name: string;
  description?: string;
  departmentId: string;
  credits?: number;
  level?: string;
  status?: string;
  createdAt?: string;
}

// ==================== Department ====================
export interface Department {
  departmentId: string;
  name: string;
  code?: string;
  facultyId: string;
  description?: string;
  status?: string;
  createdAt?: string;
}

// ==================== Faculty ====================
export interface Faculty {
  facultyId: string;
  name: string;
  code?: string;
  collegeHubId?: string;
  description?: string;
}

// ==================== Campus ====================
export interface Campus {
  id?: string;
  campusId?: string;
  name: string;
  code?: string;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  province?: string;
  abbreviation?: string;
  description?: string;
  status?: string;
}

// ==================== File ====================
export interface FileUpload {
  fileId: string;
  moduleId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  status: 'PENDING_UPLOAD' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'INFECTED';
  uploadedBy: string;
  uploadedAt: string;
  ragProcessed?: boolean;
}

// ==================== Chat ====================
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  moduleCode?: string;
  attachments?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  moduleCode: string;
  moduleId?: string;
  lastMessage: string;
  timestamp: string;
  messages: ChatMessage[];
  contentIds?: string[];
  createdAt: string;
}

// ==================== Content ====================
export interface ContentItem {
  id: string;
  moduleId: string;
  title: string;
  type: 'video' | 'pdf' | 'document' | 'notes';
  source: 'lecturer' | 'ai-tutor';
  category: string;
  author: string;
  createdAt: string;
}

// ==================== Admin Specific ====================
export interface AdminModule {
  moduleId?: string;
  id?: string;
  code: string;
  name: string;
  description?: string;
  courseId?: string;
  departmentId?: string;
}
