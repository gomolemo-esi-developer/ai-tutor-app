/**
 * Mock API Service
 * Provides safe mock data functionality with async behavior
 * Simulates real API calls without backend dependency
 */

import {
  mockModules,
  mockChatSessions,
  mockMessages,
  mockDepartments,
  mockCampuses,
  mockLecturers,
  mockStudents,
  mockAdminStats,
} from '@/data/mockData';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiService = {
  // Admin endpoints
  async getAdminStats() {
    await delay();
    return { data: mockAdminStats };
  },

  async getCampuses() {
    await delay();
    return {
      data: mockCampuses.map(campus => ({
        id: campus.id,
        name: campus.name,
        abbreviation: campus.name.charAt(0),
        address: `${campus.city}, ${campus.country}`,
      })),
    };
  },

  async getDepartments() {
    await delay();
    return {
      data: mockDepartments.map(dept => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
      })),
    };
  },

  async getCourses() {
    await delay();
    return {
      data: mockModules.map(module => ({
        id: module.id,
        code: module.code,
        name: module.title,
        description: module.description,
      })),
    };
  },

  async getEducators() {
    await delay();
    return { data: mockLecturers };
  },

  async getStudents() {
    await delay();
    return { data: mockStudents };
  },

  // Educator endpoints
  async getEducatorModules() {
    await delay();
    return { data: mockModules };
  },

  async getEducatorProfile() {
    await delay();
    return {
      data: {
        userId: 'educator-456',
        email: 'educator@test.com',
        firstName: 'Jane',
        lastName: 'Educator',
        role: 'educator',
      },
    };
  },

  async getEducatorFiles(moduleId?: string) {
    await delay();
    return {
      data: [
        {
          id: 'file-1',
          name: 'Lecture Slides - Week 1',
          type: 'pdf',
          size: 2048,
          uploadedAt: new Date().toISOString(),
          moduleId: moduleId || 'module-1',
        },
      ],
    };
  },

  // Student endpoints
  async getStudentProfile() {
    await delay();
    return {
      data: {
        userId: 'student-123',
        email: 'student@test.com',
        firstName: 'John',
        lastName: 'Student',
        role: 'student',
      },
    };
  },

  async getStudentModules() {
    await delay();
    return { data: mockModules };
  },

  // Chat endpoints
  async getChats() {
    await delay();
    return { data: mockChatSessions };
  },

  async getChatMessages(chatId: string) {
    await delay();
    return { data: mockMessages[chatId] || [] };
  },

  async createChat(title: string) {
    await delay();
    const newChat = {
      id: `chat-${Date.now()}`,
      title,
      createdAt: new Date().toISOString(),
    };
    return { data: newChat };
  },

  async sendMessage(chatId: string, content: string) {
    await delay();
    const newMessage = {
      id: `msg-${Date.now()}`,
      chatId,
      sender: 'user' as const,
      content,
      timestamp: new Date().toISOString(),
    };
    return { data: newMessage };
  },

  // Create/Update/Delete operations (with optimistic responses)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createItem(path: string, data: Record<string, any>) {
    await delay();
    return {
      data: {
        id: `item-${Date.now()}`,
        ...data,
      },
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateItem(path: string, data: Record<string, any>) {
    await delay();
    return { data };
  },

  async deleteItem(path: string) {
    await delay();
    return { success: true };
  },

  // File upload
  async uploadFile(file: File, moduleId?: string) {
    await delay(500); // Simulate file upload
    return {
      data: {
        id: `file-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        moduleId: moduleId || 'module-1',
      },
    };
  },
};

export default mockApiService;
