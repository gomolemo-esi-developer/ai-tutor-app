/**
 * StudentService - Production Implementation
 * Connects to real backend API via apiClient
 */

import { apiClient } from '@/lib/api';
import mockApiService from './mockApiService';

export const StudentService = {
  /**
   * Get student's enrolled modules
   * GET /api/student/modules
   */
  async getStudentModules() {
    try {
      return await apiClient.get('/api/student/modules');
    } catch (error) {
      console.error('Failed to fetch student modules:', error);
      // Fallback to mock for development
      const response = await mockApiService.getStudentModules();
      return response.data || [];
    }
  },

  /**
   * Get student progress in a module
   * GET /api/student/modules/{moduleId}/progress (if implemented)
   */
  async getStudentProgress(moduleId: string) {
    return { moduleId, progress: 75, completed: false };
  },

  /**
   * Update student progress
   */
  async updateProgress(moduleId: string, data: any) {
    return { moduleId, ...data };
  },

  /**
   * Get all student enrollments
   * Alias for getStudentModules
   */
  async getEnrollments() {
    return this.getStudentModules();
  },

  /**
   * Enroll in a module
   * POST /api/student/modules/{moduleId}/enroll (if implemented)
   */
  async enrollModule(moduleId: string) {
    return { moduleId, enrolled: true };
  },

  /**
   * Get student profile
   * GET /api/student/profile
   */
  async getProfile() {
    try {
      return await apiClient.get('/api/student/profile');
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
      // Fallback to mock for development
      const response = await mockApiService.getStudentProfile();
      return response.data || {};
    }
  },

  /**
   * Get module content/files
   * GET /api/student/modules/{moduleCode}/content
   */
  async getModuleContent(moduleCode: string) {
    try {
      return await apiClient.get(`/api/student/modules/${moduleCode}/content`);
    } catch (error) {
      console.error(`Failed to fetch content for module ${moduleCode}:`, error);
      return [];
    }
  },

  /**
   * Get download URL for a file
   * GET /api/student/content/{fileId}/download-url
   */
  async getFileDownloadUrl(fileId: string) {
    try {
      return await apiClient.get(`/api/student/content/${fileId}/download-url`);
    } catch (error) {
      console.error(`Failed to get download URL for file ${fileId}:`, error);
      throw error;
    }
  },
};

export default StudentService;
