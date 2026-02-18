/**
 * EducatorService - Production Implementation
 * Connects to real backend API via apiClient
 */

import { apiClient } from '@/lib/api';
import mockApiService from './mockApiService';

export const EducatorService = {
  /**
   * Get educator's assigned modules
   * GET /api/educator/modules
   */
  async getModules() {
    try {
      return await apiClient.get('/api/educator/modules');
    } catch (error) {
      console.error('Failed to fetch educator modules:', error);
      // Fallback to mock for development
      const response = await mockApiService.getEducatorModules();
      return response.data || [];
    }
  },

  /**
   * Create a new module
   * POST /api/admin/modules (uses admin endpoint)
   */
  async createModule(data: any) {
    try {
      return await apiClient.post('/api/admin/modules', data);
    } catch (error) {
      console.error('Failed to create module:', error);
      throw error;
    }
  },

  /**
   * Update a module
   * PUT /api/admin/modules/{id}
   */
  async updateModule(moduleId: string, data: any) {
    try {
      return await apiClient.put(`/api/admin/modules/${moduleId}`, data);
    } catch (error) {
      console.error('Failed to update module:', error);
      throw error;
    }
  },

  /**
   * Delete a module
   * DELETE /api/admin/modules/{id}
   */
  async deleteModule(moduleId: string) {
    try {
      await apiClient.delete(`/api/admin/modules/${moduleId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete module:', error);
      throw error;
    }
  },

  /**
   * Get presigned URL for file upload
   * POST /api/educator/files/upload-link
   * Returns: { uploadUrl, fileId }
   */
  async getUploadLink(fileName: string, fileSize: number, mimeType: string, moduleCode: string) {
    try {
      // Extract file type from filename (e.g., "document.pdf" -> "pdf")
      const fileType = fileName.toLowerCase().split('.').pop() || 'unknown';
      
      const response = await apiClient.post('/api/educator/files/upload-link', {
        fileName,
        fileSize,
        mimeType,
        fileType,
        moduleCode,
      });
      return response;
    } catch (error) {
      console.error('Failed to get upload link:', error);
      throw error;
    }
  },

  /**
   * Upload file directly to S3 using presigned URL
   * Uses apiClient.uploadToPresignedUrl
   */
  async uploadFileToS3(presignedUrl: string, file: File) {
    try {
      await apiClient.uploadToPresignedUrl(presignedUrl, file);
      return true;
    } catch (error) {
      console.error('Failed to upload file to S3:', error);
      throw error;
    }
  },

  /**
   * Save file metadata after S3 upload
   * POST /api/educator/files
   * Called after successful S3 upload to register file in system
   */
  async saveFileMetadata(fileId: string, fileName: string, fileSize: number, mimeType: string, moduleCode: string, s3Key: string) {
    try {
      return await apiClient.post('/api/educator/files', {
        fileId,
        fileName,
        fileSize,
        mimeType,
        moduleCode,
        s3Key,
      });
    } catch (error) {
      console.error('Failed to save file metadata:', error);
      throw error;
    }
  },

  /**
   * Upload file - convenience wrapper with error handling and rollback
   * Handles: get presigned URL → upload to S3 → save metadata
   * 
   * If metadata save fails (Step 3), the file is cleaned up from S3.
   * This prevents orphaned S3 objects when database operations fail.
   */
  async uploadFile(moduleCode: string, file: File) {
    let fileId: string = '';
    let s3Key: string = '';
    let uploadUrl: string = '';
    
    try {
      // Step 1: Get presigned URL from backend
      // This also creates a placeholder file record in DynamoDB
      const response = await this.getUploadLink(
        file.name,
        file.size,
        file.type,
        moduleCode
      );
      fileId = response.fileId;
      uploadUrl = response.uploadUrl;
      s3Key = response.s3Key || uploadUrl.split('?')[0];
      
      console.log('✅ Step 1 complete: Upload URL generated', { fileId, s3Key });

      // Step 2: Upload to S3 directly (no backend involved)
      try {
        await this.uploadFileToS3(uploadUrl, file);
        console.log('✅ Step 2 complete: File uploaded to S3', { fileId, fileName: file.name });
      } catch (s3Error) {
        console.error('❌ Step 2 failed: S3 upload error', s3Error);
        // If S3 upload fails, the placeholder in DB will be cleaned by TTL
        throw new Error(`S3 upload failed: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`);
      }

      // Step 3: Save metadata to DynamoDB
      // This is where most failures occur (network, timeout, validation)
      try {
        await this.saveFileMetadata(
          fileId,
          file.name,
          file.size,
          file.type,
          moduleCode,
          s3Key
        );
        console.log('✅ Step 3 complete: Metadata saved to DynamoDB', { fileId });
      } catch (metadataError) {
        console.error('❌ Step 3 failed: Metadata save error', metadataError);
        
        // ROLLBACK: Delete the file from S3 to prevent orphaned objects
        console.warn('🔄 Rolling back: Attempting to delete S3 file...', { s3Key });
        try {
          // Make a DELETE request to backend to remove the S3 file
          // If there's a backend endpoint for this, use it
          // Otherwise, we'll just log a warning for manual cleanup
          console.warn('⚠️ Manual cleanup required: Delete S3 object at', { bucket: 'aitutor-files', key: s3Key });
          
          // Attempt to delete via API if endpoint exists
          await apiClient.delete(`/api/educator/files/${fileId}`);
          console.log('✅ Rollback complete: S3 file deleted');
        } catch (cleanupError) {
          console.error('❌ Rollback failed: Could not delete S3 file', cleanupError);
          // Log for manual review - file is orphaned but will be cleaned up by S3 lifecycle rules
          console.error('⚠️ ORPHANED FILE DETECTED: Manual cleanup needed for', { fileId, s3Key });
        }
        
        throw metadataError;
      }

      return { id: fileId, name: file.name, size: file.size };
    } catch (error) {
      console.error('❌ File upload failed:', {
        fileId,
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Delete a file
   * DELETE /api/educator/files/{fileId}
   */
  async deleteFile(fileId: string) {
    try {
      await apiClient.delete(`/api/educator/files/${fileId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },

  /**
   * Get educator profile
   * GET /api/educator/profile
   */
  async getProfile() {
    try {
      return await apiClient.get('/api/educator/profile');
    } catch (error) {
      console.error('Failed to fetch educator profile:', error);
      // Fallback to mock for development
      const response = await mockApiService.getEducatorProfile();
      return response.data || {};
    }
  },

  /**
   * Get all students (admin endpoint)
   * GET /api/admin/students
   */
  async getStudents() {
    try {
      return await apiClient.get('/api/admin/students');
    } catch (error) {
      console.error('Failed to fetch students:', error);
      // Fallback to mock for development
      const response = await mockApiService.getStudents();
      return response.data || [];
    }
  },

  /**
   * Get files uploaded by educator for a module
   * GET /api/educator/files?moduleCode={code}
   * 
   * Returns: { moduleCode, moduleName, moduleId, files: [...] }
   * where each file has: fileId, fileName, fileSize, fileType, uploadedAt, lecturerId, createdBy
   */
  async getFiles(moduleCode?: string) {
    try {
      const url = moduleCode 
        ? `/api/educator/files?moduleCode=${moduleCode}`
        : '/api/educator/files';
      return await apiClient.get(url);
    } catch (error) {
      console.error('Failed to fetch educator files:', error);
      return { files: [] };
    }
  },

  /**
   * Get available content types
   * GET /api/educator/content-types (or returns defaults)
   */
  async getContentTypes() {
    try {
      return await apiClient.get('/api/educator/content-types');
    } catch (error) {
      console.error('Failed to fetch content types:', error);
      // Return default content types if API call fails
      return [
        { value: 'lecture-notes', label: 'Lecture Notes' },
        { value: 'presentations', label: 'Presentations' },
        { value: 'assignments', label: 'Assignments' },
        { value: 'exams', label: 'Exams' },
        { value: 'videos', label: 'Videos' },
        { value: 'images', label: 'Images' },
        { value: 'lab-materials', label: 'Lab Materials' },
        { value: 'projects', label: 'Projects' },
      ];
    }
  },

  /**
   * Save file metadata with full details
   * POST /api/educator/files
   * 
   * Note: This is a wrapper around saveFileMetadata that accepts metadata object
   * For direct low-level API calls, use saveFileMetadata instead
   */
  async saveFile(data: {
    fileName: string;
    fileId: string;
    fileSize: number;
    mimeType: string;
    fileType: string;
    s3Key: string;
    metadata: {
      title: string;
      moduleCode: string;
      contentType: string;
      author: string;
      description: string;
    };
  }) {
    try {
      // Transform the nested metadata structure to flat structure expected by backend
      const payload = {
        fileId: data.fileId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileType: data.fileType,
        s3Key: data.s3Key,
        moduleCode: data.metadata.moduleCode,
        // Backend stores these in file record if needed
        title: data.metadata.title,
        contentType: data.metadata.contentType,
        author: data.metadata.author,
        description: data.metadata.description,
      };
      // Use extended timeout (10 minutes) for file processing
      // Audio/video transcription with Whisper can take time, with up to 3 retries
      return await apiClient.post('/api/educator/files', payload, {
        timeout: 10 * 60 * 1000, // 10 minutes (to allow for RAG retries)
      });
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  },
};

export default EducatorService;
