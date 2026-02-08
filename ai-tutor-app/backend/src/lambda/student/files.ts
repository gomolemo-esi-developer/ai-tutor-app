/**
 * Student Files Handler
 * Handles: downloading files, getting module content
 *
 * Frontend: /modules/:moduleCode route (File List, Download button)
 * Endpoints:
 *   - GET /api/student/modules/{moduleCode}/content - Get files in a module
 *   - GET /api/student/content/{fileId}/download-url - Get S3 presigned download URL
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Service } from '../../services/s3.service';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/error.util';
import { File } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * GET /api/student/modules/{moduleCode}/content - Get files in a module
 * Authorization: STUDENT role required (must be enrolled in module)
 * Returns: List of files in the module with metadata
 */
export async function handleGetModuleContent(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);
    const moduleCode = LambdaUtil.getPathParam(event, 'moduleCode');

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (role !== 'STUDENT') {
      throw new ForbiddenError('Only students can access this endpoint');
    }

    if (!moduleCode) {
      throw new BadRequestError('Module code is required');
    }

    LoggerUtil.info('Fetching module content', { userId, moduleCode });

    // Get student record
    let studentItems: any = [];
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = items;

    // If not found by userId, try email lookup (fallback for auth mismatches)
    if (!studentItems || studentItems.length === 0) {
      const userEmail = event.requestContext?.authorizer?.claims?.email;
      if (userEmail) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, userEmail });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': userEmail },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items;
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const student = studentItems[0];

    // Get module by moduleCode using scan (GSI may not exist)
    const { items: moduleItems } = await DynamoDBService.scan(
      tables.MODULES,
      {
        filterExpression: 'moduleCode = :moduleCode',
        expressionAttributeValues: { ':moduleCode': moduleCode }
      }
    );

    if (!moduleItems || moduleItems.length === 0) {
      throw new NotFoundError('Module not found');
    }

    const module = moduleItems[0];
    const moduleId = module.moduleId;

    // Verify student is enrolled in this module
    if (!student.moduleIds || !student.moduleIds.includes(moduleId)) {
      throw new ForbiddenError('You are not enrolled in this module');
    }

    // Get files for this module using scan with filter
    const { items: files } = await DynamoDBService.scan(
      tables.FILES,
      {
        filterExpression: 'moduleId = :moduleId',
        expressionAttributeValues: { ':moduleId': moduleId }
      }
    );

    // Filter files by: status, published flag, and access control
    // Ensure students only see files that are:
    // 1. ACTIVE (not DELETED or ARCHIVED)
    // 2. PUBLISHED (not in draft status)
    // 3. Have appropriate access level (MODULE_ONLY is default, also allow DEPARTMENT/UNIVERSITY)
    const activeFiles = (files || [])
      .filter((f: File) => {
        // Exclude deleted/archived files
        if (f.status === 'DELETED' || f.status === 'ARCHIVED') {
          LoggerUtil.debug('File filtered out: not active', { fileId: f.fileId, status: f.status });
          return false;
        }
        
        // Only show published files (exclude draft/unpublished)
        if (f.isPublished === false) {
          LoggerUtil.debug('File filtered out: not published', { fileId: f.fileId });
          return false;
        }
        
        // Check access level restrictions
        if (f.accessLevel && f.accessLevel !== 'MODULE_ONLY' && f.accessLevel !== 'DEPARTMENT' && f.accessLevel !== 'UNIVERSITY' && f.accessLevel !== 'PUBLIC') {
          // If accessLevel is something unexpected, deny access by default
          LoggerUtil.debug('File filtered out: invalid access level', { fileId: f.fileId, accessLevel: f.accessLevel });
          return false;
        }
        
        return true;
      })
      .map((f: File) => ({
         fileId: f.fileId,
         fileName: f.fileName,
         title: f.title || f.fileName,
         fileSize: f.fileSize,
         fileType: f.fileType,
         uploadedAt: f.uploadedAt,
         mimeType: f.mimeType,
         isPublished: f.isPublished !== false, // Default to true for backward compatibility
         accessLevel: f.accessLevel || 'MODULE_ONLY',
         contentType: f.contentType,
       }));

    LoggerUtil.info('Module content retrieved', {
      userId,
      moduleCode,
      fileCount: activeFiles.length,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        moduleCode: module.moduleCode,
        moduleName: module.moduleName,
        files: activeFiles,
      })
    );
  });
}

/**
 * GET /api/student/content/{fileId}/download-url - Get S3 presigned download URL
 * Authorization: STUDENT role required (must be enrolled in module containing file)
 * Returns: Presigned S3 download URL valid for 15 minutes
 */
export async function handleGetDownloadUrl(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);
    const fileId = LambdaUtil.getPathParam(event, 'fileId');

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (role !== 'STUDENT') {
      throw new ForbiddenError('Only students can download content');
    }

    if (!fileId) {
      throw new BadRequestError('File ID is required');
    }

    LoggerUtil.info('Generating download URL', { userId, fileId });

    // Get file metadata
    const file = await DynamoDBService.get(tables.FILES, { fileId });

    if (!file) {
      throw new NotFoundError('File not found');
    }

    if (file.status === 'DELETED') {
      throw new NotFoundError('File has been deleted');
    }

    // Get student record
    let { items: studentItems } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    // If not found by userId, try email lookup (fallback)
    if (!studentItems || studentItems.length === 0) {
      const userEmail = event.requestContext?.authorizer?.claims?.email;
      if (userEmail) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, userEmail });
        const { items: emailItems } = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': userEmail },
          { indexName: 'email-index' }
        );
        studentItems = emailItems;
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const student = studentItems[0];

    // Verify student is enrolled in the module containing this file
    if (!student.moduleIds || !student.moduleIds.includes(file.moduleId)) {
      throw new ForbiddenError('You are not enrolled in the module containing this file');
    }

    // Generate presigned download URL (15 minutes expiry)
    const downloadUrl = await S3Service.generateDownloadUrl(file.s3Key, 900, file.fileName);

    LoggerUtil.info('Download URL generated', {
      userId,
      fileId,
      fileName: file.fileName,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        downloadUrl: downloadUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
      })
    );
  });
}
