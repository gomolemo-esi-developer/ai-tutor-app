/**
 * AdminService - Mock Implementation
 * Uses mock data. Replace with real backend calls when API is ready.
 */

import { apiClient } from '@/lib/api';
import mockApiService from './mockApiService';

export const AdminService = {
  async getUsers() {
    const response = await mockApiService.getStudents();
    return response.data || [];
  },

  async getUser(userId: string) {
    const response = await mockApiService.getStudents();
    const users = response.data || [];
    return users.find(u => u.id === userId) || null;
  },

  async createUser(data: any) {
    const response = await mockApiService.createItem('/admin/users', data);
    return response.data || data;
  },

  async updateUser(userId: string, data: any) {
    const response = await mockApiService.updateItem(`/admin/users/${userId}`, data);
    return response.data || data;
  },

  async deleteUser(userId: string) {
    await mockApiService.deleteItem(`/admin/users/${userId}`);
    return true;
  },

  async getStudents() {
    const response = await mockApiService.getStudents();
    return response.data || [];
  },

  async getEducators() {
    const response = await mockApiService.getEducators();
    return response.data || [];
  },

  async getCourses() {
    const response = await mockApiService.getCourses();
    return response.data || [];
  },

  async getDepartments() {
    const response = await mockApiService.getDepartments();
    return response.data || [];
  },

  async getAuditLogs() {
    return [
      {
        id: 'log-1',
        action: 'User created',
        timestamp: new Date().toISOString(),
        user: 'admin@test.com',
      },
    ];
  },

  async getFiles(page: number = 1, limit: number = 100) {
    try {
      // Call real backend API: GET /api/admin/files
      const offset = (page - 1) * limit;
      const filesArray = await apiClient.get<any[]>(`/api/admin/files?limit=${limit}&offset=${offset}`);
      
      // apiClient.get() returns the data array directly (not wrapped in response object)
      // Transform DynamoDB files to admin files format
      const files = (filesArray || []).map((file: any) => ({
        id: file.fileId,
        fileId: file.fileId,
        name: file.fileName,
        fileName: file.fileName,
        moduleId: file.moduleId,
        moduleName: file.moduleName || 'N/A',
        moduleCode: file.moduleCode || file.moduleId || 'N/A', // Use moduleCode if available, fallback to moduleId
        lecturerId: file.lecturerId,
        authorName: file.author || file.createdBy || 'Unknown',
        type: file.fileType,
        fileType: file.fileType,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        description: file.description || '',
        contentType: file.contentType || '',
        isPublished: file.isPublished,
        status: file.status,
        s3Key: file.s3Key,
        s3Bucket: file.s3Bucket,
        createdAt: file.createdAt ? new Date(file.createdAt).toISOString() : new Date().toISOString(),
        uploadedAt: file.uploadedAt ? new Date(file.uploadedAt).toISOString() : new Date().toISOString(),
        updatedAt: file.updatedAt ? new Date(file.updatedAt).toISOString() : new Date().toISOString(),
      }));
      
      return { files };
    } catch (error) {
      console.error('Failed to fetch admin files:', error);
      return { files: [] };
    }
  },
};

export default AdminService;
