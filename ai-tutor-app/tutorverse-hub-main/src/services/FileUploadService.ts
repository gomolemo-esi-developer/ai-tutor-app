/**
 * FileUploadService - Real Backend Implementation
 * Connects to actual backend API for file operations
 * Uses EducatorService for real API calls
 */

import EducatorService from './EducatorService';

export const FileUploadService = {
  /**
   * Upload file using 3-step process via EducatorService
   * Step 1: Get presigned URL from backend
   * Step 2: Upload file directly to S3
   * Step 3: Save metadata to DynamoDB
   */
  async uploadFile(moduleCode: string, file: File, metadata?: any) {
    try {
      // Use EducatorService.uploadFile which handles the complete 3-step flow
      const response = await EducatorService.uploadFile(moduleCode, file);
      return {
        ...response,
        ...metadata,
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  },

  /**
   * Delete a file via backend
   * DELETE /api/educator/files/{fileId}
   */
  async deleteFile(fileId: string) {
    try {
      await EducatorService.deleteFile(fileId);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },

  /**
   * Get files for a module via backend
   * GET /api/educator/files?moduleCode={code}
   */
  async getFiles(moduleCode: string) {
    try {
      const response = await EducatorService.getFiles(moduleCode);
      return response || [];
    } catch (error) {
      console.error('Failed to fetch files:', error);
      throw error;
    }
  },

  /**
   * Update file metadata via backend
   * Note: If this endpoint doesn't exist, comment out or implement on backend
   */
  async updateFile(fileId: string, metadata: any) {
    try {
      // This endpoint may not exist yet on backend
      // Consider using EducatorService.saveFileMetadata instead if needed
      console.warn('updateFile not yet implemented in backend');
      return metadata;
    } catch (error) {
      console.error('Failed to update file:', error);
      throw error;
    }
  },
};

export default FileUploadService;
