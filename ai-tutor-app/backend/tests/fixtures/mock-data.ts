import { User, Lecturer, Student, Module, File, ChatSession, Quiz } from '../../src/models/types';

/**
 * Mock user data for testing
 */
export const mockUsers = {
  admin: {
    userId: 'user_12345678-1234-1234-1234-123456789012',
    email: 'admin@tutorverse.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    emailVerified: true,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as User,

  educator: {
    userId: 'user_87654321-4321-4321-4321-210987654321',
    email: 'educator@tutorverse.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'EDUCATOR' as const,
    status: 'ACTIVE' as const,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    emailVerified: true,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as User,

  student: {
    userId: 'user_11111111-2222-3333-4444-555555555555',
    email: 'student@tutorverse.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'STUDENT' as const,
    status: 'ACTIVE' as const,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    emailVerified: true,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as User,
};

/**
 * Mock lecturer data
 */
export const mockLecturers = {
  lecturer1: {
    lecturerId: 'lecturer_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    userId: mockUsers.educator.userId,
    department: 'Computer Science',
    qualifications: ['BSc Computer Science', 'MSc Artificial Intelligence'],
    specialization: 'Machine Learning',
    officeLocation: 'Building A, Room 201',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Lecturer,
};

/**
 * Mock student data
 */
export const mockStudents = {
  student1: {
    studentId: 'student_11111111-1111-1111-1111-111111111111',
    userId: mockUsers.student.userId,
    enrollmentNumber: 'STU-2024-00001',
    grade: '3rd Year',
    major: 'Computer Science',
    enrolledModules: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Student,
};

/**
 * Mock module data
 */
export const mockModules = {
  module1: {
    moduleId: 'module_ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb',
    title: 'Introduction to Machine Learning',
    description: 'Learn the fundamentals of machine learning including supervised and unsupervised learning.',
    code: 'CS301',
    lecturerId: mockLecturers.lecturer1.lecturerId,
    status: 'PUBLISHED' as const,
    content: 'Machine learning is a subset of artificial intelligence...',
    materials: [],
    quizzes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enrolledStudents: 42,
  } as Module,

  module2: {
    moduleId: 'module_11111111-2222-3333-4444-555555555555',
    title: 'Web Development Fundamentals',
    description: 'Master HTML, CSS, and JavaScript for modern web development.',
    code: 'CS101',
    lecturerId: mockLecturers.lecturer1.lecturerId,
    status: 'DRAFT' as const,
    content: 'Web development has evolved significantly over the years...',
    materials: [],
    quizzes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enrolledStudents: 0,
  } as Module,
};

/**
 * Mock file data
 */
export const mockFiles = {
  file1: {
    fileId: 'file_aaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    fileName: 'ml-lecture-01.pdf',
    fileType: 'PDF' as const,
    fileSize: 2500000,
    uploadedBy: mockUsers.educator.userId,
    moduleId: mockModules.module1.moduleId,
    s3Key: 'uploads/user_87654321/file_aaaa/1234567890-ml-lecture-01.pdf',
    s3Bucket: 'aitutor-files-development',
    mimeType: 'application/pdf',
    uploadedAt: new Date().toISOString(),
  } as File,
};

/**
 * Mock chat session data
 */
export const mockChatSessions = {
  session1: {
    chatSessionId: 'chat_zzzzzzz-yyyy-xxxx-wwww-vvvvvvvvvvvv',
    userId: mockUsers.student.userId,
    moduleId: mockModules.module1.moduleId,
    title: 'Clarifications on Neural Networks',
    messages: [
      {
        messageId: 'msg_1',
        role: 'user' as const,
        content: 'What is a neural network?',
        createdAt: new Date().toISOString(),
      },
      {
        messageId: 'msg_2',
        role: 'assistant' as const,
        content: 'A neural network is a computational model inspired by biological neural networks...',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } as ChatSession,
};

/**
 * Mock quiz data
 */
export const mockQuizzes = {
  quiz1: {
    quizId: 'quiz_qqqqqqqq-rrrr-ssss-tttt-uuuuuuuuuuuu',
    moduleId: mockModules.module1.moduleId,
    title: 'ML Fundamentals Quiz',
    description: 'Test your understanding of machine learning basics.',
    questions: [
      {
        questionId: 'q_1',
        question: 'What is the main goal of supervised learning?',
        type: 'multiple_choice' as const,
        options: [
          'To find patterns without labels',
          'To predict outputs based on labeled training data',
          'To cluster similar data points',
          'To reduce data dimensions',
        ],
        correctAnswer: 'To predict outputs based on labeled training data',
        points: 1,
      },
      {
        questionId: 'q_2',
        question: 'Which of these is a classification algorithm?',
        type: 'multiple_choice' as const,
        options: ['Linear Regression', 'K-Means', 'Decision Trees', 'PCA'],
        correctAnswer: 'Decision Trees',
        points: 1,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Quiz,
};

/**
 * Generate a new mock user
 */
export function generateMockUser(overrides?: Partial<User>): User {
  const id = `user_${Math.random().toString(36).substr(2, 9)}`;
  return {
    userId: id,
    email: `user${Date.now()}@tutorverse.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'STUDENT',
    status: 'ACTIVE',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    emailVerified: true,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a new mock module
 */
export function generateMockModule(overrides?: Partial<Module>): Module {
  const id = `module_${Math.random().toString(36).substr(2, 9)}`;
  return {
    moduleId: id,
    title: 'Test Module',
    description: 'This is a test module',
    code: `TST${Math.floor(Math.random() * 1000)}`,
    lecturerId: mockLecturers.lecturer1.lecturerId,
    status: 'DRAFT',
    materials: [],
    quizzes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    enrolledStudents: 0,
    ...overrides,
  };
}
