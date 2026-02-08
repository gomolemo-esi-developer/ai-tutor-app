/**
 * Educator Portal Files Handler
 * Student & Educator Portal specific endpoints
 *
 * Frontend: /files/:moduleCode route (Upload Form, File List)
 * Endpoints:
 *   - POST /api/educator/files/upload-link - Get S3 presigned upload URL
 *   - POST /api/educator/files - Save file metadata after upload
 *   - GET /api/educator/files?moduleCode={code} - List files in a module
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Service } from '../../services/s3.service';
import { DynamoDBService } from '../../services/dynamodb.service';
import { getRagService } from '../../services/rag.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { File } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * POST /api/educator/files/upload-link - Get S3 presigned upload URL
 * Authorization: EDUCATOR role required (must be assigned to module)
 * Request: { moduleCode, fileName, fileSize, fileType, mimeType }
 * Returns: { fileId, uploadUrl, bucket, s3Key }
 */
export async function handleGetUploadLink(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    try {
      const userId = LambdaUtil.getUserId(event);
      const role = LambdaUtil.getUserRole(event);
      const body = LambdaUtil.parseBody(event);

      LoggerUtil.info('Upload link request received', {
        userId,
        role,
        body,
      });

      if (!userId) {
        throw new ForbiddenError('User not authenticated');
      }

      if (role !== 'EDUCATOR') {
        throw new ForbiddenError('Only educators can upload files');
      }

      const { moduleCode, fileName, fileSize, fileType, mimeType } = body;

      if (!moduleCode || !fileName || !fileSize || !fileType || !mimeType) {
        throw new BadRequestError(
          'Missing required fields: moduleCode, fileName, fileSize, fileType, mimeType'
        );
      }

      LoggerUtil.info('Generating upload link', { userId, moduleCode, fileName });

    // Get educator record
    const { items: educatorItems } = await DynamoDBService.query(
      tables.LECTURERS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    if (!educatorItems || educatorItems.length === 0) {
      throw new NotFoundError('Educator profile not found');
    }

    const educator = educatorItems[0];
    const educatorId = educator.lecturerId;

    LoggerUtil.info('Educator found', {
      educatorId,
      assignedModuleIds: educator.moduleIds,
      requestedModuleCode: moduleCode,
    });

    // Get educator's modules using batchGet
    const moduleKeys = educator.moduleIds.map((moduleId: string) => ({ moduleId }));
    const modules = await DynamoDBService.batchGet(tables.MODULES, moduleKeys);

    // Find the module with matching moduleCode
    const module = modules.find(
      (m: any) => m.moduleCode === moduleCode
    );

    if (!module) {
      LoggerUtil.warn('Module not found for code', { moduleCode, assignedModuleIds: educator.moduleIds });
      throw new NotFoundError(`Module not found for code: ${moduleCode}`);
    }

    const moduleId = module.moduleId;

    LoggerUtil.info('Module found', {
      moduleId,
      moduleCode,
    });

    // Verify educator is assigned to this module
    if (!educator.moduleIds || !educator.moduleIds.includes(moduleId)) {
      LoggerUtil.warn('Educator not assigned to module', {
        educatorId,
        moduleId,
        assignedModuleIds: educator.moduleIds,
      });
      throw new ForbiddenError('You are not assigned to this module');
    }

    // Generate file ID and S3 key
    const fileId = UuidUtil.generateFileId();
    const s3Key = `modules/${moduleCode}/${fileId}/${fileName}`;

    // Generate presigned upload URL (15 minutes expiry)
    const uploadUrl = await S3Service.generateUploadUrl(s3Key, 900);

    LoggerUtil.info('Upload link generated', {
      userId,
      moduleCode,
      fileId,
      s3Key,
    });

      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success({
          fileId: fileId,
          uploadUrl: uploadUrl,
          bucket: DatabaseConfig.getTables().FILES, // Return for reference, but S3 bucket name
          s3Key: s3Key,
        })
      );
    } catch (err: any) {
      LoggerUtil.error('Unexpected error in handleGetUploadLink', err);
      throw err;
    }
  });
}

/**
 * POST /api/educator/files - Save file metadata after S3 upload
 * Authorization: EDUCATOR role required
 * Request: { fileId, moduleCode, fileName, fileSize, fileType, s3Key, mimeType }
 * Returns: { success, message, fileId, uploadedAt }
 */
export async function handleSaveFileMetadata(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);
    const body = LambdaUtil.parseBody(event);

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (role !== 'EDUCATOR') {
      throw new ForbiddenError('Only educators can save files');
    }

    const { fileId, moduleCode, fileName, fileSize, fileType, s3Key, mimeType, title, contentType, author, description } = body;

    if (!fileId || !moduleCode || !fileName || !fileSize || !fileType || !s3Key || !mimeType) {
      throw new BadRequestError(
        'Missing required fields: fileId, moduleCode, fileName, fileSize, fileType, s3Key, mimeType'
      );
    }

    LoggerUtil.info('Saving file metadata', { userId, moduleCode, fileId, fileName });

    // Get educator record
    const { items: educatorItems } = await DynamoDBService.query(
      tables.LECTURERS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    if (!educatorItems || educatorItems.length === 0) {
      throw new NotFoundError('Educator profile not found');
    }

    const educator = educatorItems[0];
    const educatorId = educator.lecturerId;

    // Get educator's modules using batchGet
    const moduleKeys = educator.moduleIds.map((moduleId: string) => ({ moduleId }));
    const modules = await DynamoDBService.batchGet(tables.MODULES, moduleKeys);

    // Find the module with matching moduleCode
    const module = modules.find(
      (m: any) => m.moduleCode === moduleCode
    );

    if (!module) {
      throw new NotFoundError('Module not found');
    }

    const moduleId = module.moduleId;

    // Verify educator is assigned to this module
    if (!educator.moduleIds || !educator.moduleIds.includes(moduleId)) {
      throw new ForbiddenError('You are not assigned to this module');
    }

    const now = Date.now();

    // Create/update file record with RAG fields
    const fileRecord: File = {
      fileId: fileId,
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType as any,
      mimeType: mimeType,
      s3Key: s3Key,
      s3Bucket: process.env.S3_BUCKET || 'tutorverse-files',
      lecturerId: educator.lecturerId,
      moduleId: moduleId,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: educator.lecturerId,
      status: 'ACTIVE',
      title: title || fileName,
      contentType: contentType || 'document',
      author: author || educator.lecturerId,
      description: description || '',
      isPublished: true, // Published by default so students can see it
      accessLevel: 'MODULE_ONLY', // Only students in this module can access
      ttl: Math.floor(now / 1000) + 90 * 24 * 60 * 60, // 90 days TTL in Unix seconds
      // RAG fields (initialize with pending status)
      ragProcessingStatus: 'PENDING' as any,
    };

    // Save file metadata with PENDING status initially
    await DynamoDBService.put(tables.FILES, fileRecord);

    // Try to upload file to RAG service asynchronously
    try {
      const ragService = getRagService();
      if (ragService.isEnabled()) {
        // Download file from S3
        LoggerUtil.info('[RAG] Attempting to download file from S3 for RAG upload', {
          fileId,
          s3Key,
          fileName
        });

        const fileBuffer = await S3Service.downloadFile(s3Key);

        if (fileBuffer) {
          LoggerUtil.info('[RAG] File downloaded, uploading to RAG service', {
            fileId,
            fileName,
            fileSize: fileBuffer.length
          });

          // Upload to RAG
          const ragResponse = await ragService.uploadDocument(fileBuffer, fileName);

          // Update file record with RAG metadata
          const updateData: any = {
            ragDocumentId: ragResponse.documentId,
            ragProcessingStatus: 'COMPLETE',
            ragChunkCount: ragResponse.chunkCount,
            ragProcessedAt: new Date().toISOString(),
            updatedAt: now,
          };

          await DynamoDBService.update(
            tables.FILES,
            { fileId },
            updateData
          );

          LoggerUtil.info('[RAG] File uploaded to RAG successfully', {
            fileId,
            fileName,
            documentId: ragResponse.documentId,
            chunks: ragResponse.chunkCount
          });
        } else {
          // S3 download failed
          LoggerUtil.warn('[RAG] Failed to download file from S3', { fileId, s3Key });
          await DynamoDBService.update(
            tables.FILES,
            { fileId },
            {
              ragProcessingStatus: 'FAILED',
              ragError: 'Failed to download file from S3',
              updatedAt: now,
            }
          );
        }
      } else {
        LoggerUtil.info('[RAG] RAG service disabled, skipping file upload', { fileId });
        // Mark as complete even though RAG is disabled
        await DynamoDBService.update(
          tables.FILES,
          { fileId },
          {
            ragProcessingStatus: 'COMPLETE',
            updatedAt: now,
          }
        );
      }
    } catch (ragError) {
      LoggerUtil.error('[RAG] Error uploading file to RAG service', {
        fileId,
        fileName,
        error: ragError instanceof Error ? ragError.message : String(ragError)
      });

      // Update file record with error status
      await DynamoDBService.update(
        tables.FILES,
        { fileId },
        {
          ragProcessingStatus: 'FAILED',
          ragError: ragError instanceof Error ? ragError.message : 'Unknown error',
          updatedAt: now,
        }
      );
    }

    LoggerUtil.info('File metadata saved', {
      userId,
      fileId,
      fileName,
      moduleCode,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(
        {
          success: true,
          message: 'File uploaded successfully',
          fileId: fileId,
          uploadedAt: now,
        },
        'File saved successfully'
      )
    );
  });
}

/**
 * GET /api/educator/files?moduleCode={code} - List files in a module
 * Authorization: EDUCATOR role required (must be assigned to module)
 * Query Params: moduleCode
 * Returns: List of files in the module
 */
export async function handleListModuleFiles(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);
    const moduleCode = LambdaUtil.getQueryParam(event, 'moduleCode');

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (role !== 'EDUCATOR') {
      throw new ForbiddenError('Only educators can access this endpoint');
    }

    if (!moduleCode) {
      throw new BadRequestError('Module code is required in query params');
    }

    LoggerUtil.info('Fetching module files', { userId, moduleCode });

    // Get educator record
    const { items: educatorItems } = await DynamoDBService.query(
      tables.LECTURERS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    if (!educatorItems || educatorItems.length === 0) {
      throw new NotFoundError('Educator profile not found');
    }

    const educator = educatorItems[0];
    const educatorId = educator.lecturerId;

    // Get educator's modules using batchGet
    const moduleKeys = educator.moduleIds.map((moduleId: string) => ({ moduleId }));
    const modules = await DynamoDBService.batchGet(tables.MODULES, moduleKeys);

    // Find the module with matching moduleCode
    const module = modules.find(
      (m: any) => m.moduleCode === moduleCode
    );

    if (!module) {
      throw new NotFoundError('Module not found');
    }

    const moduleId = module.moduleId;

    // Verify educator is assigned to this module
    if (!educator.moduleIds || !educator.moduleIds.includes(moduleId)) {
      throw new ForbiddenError('You are not assigned to this module');
    }

    // Get files for this module - use scan with filter since GSI may not exist
    const { items: files } = await DynamoDBService.scan(
      tables.FILES,
      {
        filterExpression: 'moduleId = :moduleId',
        expressionAttributeValues: { ':moduleId': moduleId }
      }
    );

    // Filter out deleted files and format response
    // Get lecturer info for authorName
    let lecturerName = 'Unknown Educator';
    try {
      const lecturerRecord = await DynamoDBService.get(tables.LECTURERS, { lecturerId: educator.lecturerId });
      if (lecturerRecord) {
        lecturerName = `${lecturerRecord.firstName || ''} ${lecturerRecord.lastName || ''}`.trim() || lecturerRecord.email || 'Unknown Educator';
      }
    } catch (err) {
      LoggerUtil.warn('Failed to fetch lecturer details', { lecturerId: educator.lecturerId });
    }

    const activeFiles = (files || [])
      .filter((f: File) => f.status !== 'DELETED')
      .map((f: File) => ({
        fileId: f.fileId,
        fileName: f.fileName,
        fileSize: f.fileSize,
        fileType: f.fileType,
        contentType: f.contentType,
        metadata: {
          contentType: f.contentType,
          title: f.title,
          author: f.author,
          description: f.description,
        },
        uploadedAt: f.uploadedAt,
        lecturerId: f.lecturerId,
        createdBy: lecturerName,
        ragDocumentId: (f as any).ragDocumentId,
      }));

    LoggerUtil.info('Module files retrieved', {
      userId,
      moduleCode,
      fileCount: activeFiles.length,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        moduleCode: module.moduleCode,
        moduleName: module.moduleName,
        moduleId: module.moduleId,
        files: activeFiles,
      })
    );
    });
    }

/**
 * DELETE /api/educator/files/{fileId} - Delete a file (soft delete)
 * Authorization: EDUCATOR role required (must own the file)
 * Returns: { success, message }
 */
export async function handleDeleteFile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);
    const fileId = event.pathParameters?.fileId;

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (role !== 'EDUCATOR') {
      throw new ForbiddenError('Only educators can delete files');
    }

    if (!fileId) {
      throw new BadRequestError('fileId is required');
    }

    LoggerUtil.info('Deleting file', { userId, fileId });

    // Get the file
    const file = (await DynamoDBService.get(tables.FILES, { fileId })) as File | null;

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Get educator record to verify ownership
    const { items: educatorItems } = await DynamoDBService.query(
      tables.LECTURERS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    if (!educatorItems || educatorItems.length === 0) {
      throw new NotFoundError('Educator profile not found');
    }

    const educator = educatorItems[0];

    // Verify educator owns this file
    if (file.lecturerId !== educator.lecturerId) {
      throw new ForbiddenError('You do not have permission to delete this file');
    }

    // Soft delete: mark as DELETED instead of removing
    await DynamoDBService.update(
      tables.FILES,
      { fileId },
      { status: 'DELETED', updatedAt: Date.now() }
    );

    LoggerUtil.info('File deleted', { userId, fileId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        message: 'File deleted successfully',
        fileId,
      })
    );
  });
}
