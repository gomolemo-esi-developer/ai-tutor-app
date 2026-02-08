/**
 * Educator Files Handler - File management for educators
 * Handles: list educator's files, get file details, update file metadata
 *
 * Part of Phase 3C: Files Table Backend Configuration
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { S3Service } from '../../services/s3.service';
import { DatabaseConfig } from '../../config/database.config';
import { updateEducatorFileMetadataSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError, NotFoundError, ForbiddenError, ValidationError } from '../../utils/error.util';
import { File } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * GET /educator/files - List educator's files across all modules
 * Paginated and sortable by uploadedAt or fileName
 */
export async function handleListMyFiles(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getUserId(event);
    const params = LambdaUtil.getQueryParams(event);
    const {
      limit = '20',
      offset = '0',
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
      moduleId,
    } = params;

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string) || 0;

    let items: File[] = [];
    let totalCount = 0;

    LoggerUtil.info('Querying educator files', { lecturerId });

    // Query files by lecturerId GSI
    const result = await DynamoDBService.query(
      tables.FILES,
      'lecturerId = :lecturerId',
      { ':lecturerId': lecturerId },
      {
        indexName: 'lecturerId-index',
        limit: limitNum + offsetNum,
        scanIndexForward: sortOrder === 'asc',
      }
    );

    items = (result.items || []).filter((f: any) => f.status !== 'DELETED') as File[];
    totalCount = result.count || 0;

    // Filter by moduleId if provided
    if (moduleId && typeof moduleId === 'string') {
      items = items.filter((f) => f.moduleId === moduleId);
    }

    // Apply sorting
    items = sortFiles(items, sortBy as string, sortOrder as string);

    // Apply pagination
    const paginatedItems = items.slice(offsetNum, offsetNum + limitNum);

    // Generate download URLs for each file
    const filesWithUrls = await Promise.all(
      paginatedItems.map(async (file) => {
        try {
          const downloadUrl = await S3Service.generateDownloadUrl(file.s3Key, 900, file.fileName);
          return {
            ...file,
            downloadUrl,
          };
        } catch (error) {
          LoggerUtil.warn('Failed to generate download URL', {
            fileId: file.fileId,
            error: (error as any).message,
          });
          return file;
        }
      })
    );

    LoggerUtil.info('Educator files list retrieved', {
      count: filesWithUrls.length,
      total: totalCount,
      lecturerId,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(
        filesWithUrls,
        Math.floor(offsetNum / limitNum),
        limitNum,
        totalCount
      )
    );
  });
}

/**
 * GET /educator/files/{fileId} - Get file details
 * Only accessible to the educator who uploaded the file
 */
export async function handleGetFileDetails(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getUserId(event);
    const fileId = LambdaUtil.getPathParam(event, 'fileId');

    if (!fileId) {
      throw new BadRequestError('File ID is required');
    }

    const file = (await DynamoDBService.get(tables.FILES, { fileId })) as File | null;

    if (!file || file.status === 'DELETED') {
      throw new NotFoundError('File not found');
    }

    // Verify ownership
    if (file.lecturerId !== lecturerId) {
      throw new ForbiddenError('You do not have access to this file');
    }

    LoggerUtil.info('File details retrieved', { fileId, lecturerId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(file));
  });
}

/**
 * PUT /educator/files/{fileId} - Update file metadata
 * Educators can update: description, tags, isPublished, accessLevel
 * Only accessible to the educator who uploaded the file
 */
export async function handleUpdateFileMetadata(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getUserId(event);
    const fileId = LambdaUtil.getPathParam(event, 'fileId');
    const body = LambdaUtil.parseBody(event);

    if (!fileId) {
      throw new BadRequestError('File ID is required');
    }

    // Get existing file
    const file = (await DynamoDBService.get(tables.FILES, { fileId })) as File | null;
    if (!file || file.status === 'DELETED') {
      throw new NotFoundError('File not found');
    }

    // Verify ownership
    if (file.lecturerId !== lecturerId) {
      throw new ForbiddenError('You do not have access to this file');
    }

    // Validate input
    let input;
    try {
      input = updateEducatorFileMetadataSchema.parse(body);
    } catch (error: any) {
      throw new ValidationError('Invalid update data', error.errors);
    }

    // Update file
    const updates = {
      ...input,
      updatedAt: Date.now(),
    };

    await DynamoDBService.update(tables.FILES, { fileId }, updates);

    LoggerUtil.info('File metadata updated', {
      fileId,
      lecturerId,
      fields: Object.keys(input),
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(updates, 'File updated successfully')
    );
  });
}

/**
 * GET /educator/files/{fileId}/download - Get signed download URL for file
 * Accessible to educators who uploaded the file or any educator viewing from their portal
 * (Authorization via role middleware - EDUCATOR role required)
 */
export async function handleGetDownloadUrl(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getUserId(event);
    const fileId = LambdaUtil.getPathParam(event, 'fileId');
    const params = LambdaUtil.getQueryParams(event);
    const expiresIn = Math.min(parseInt((params.expiresIn as string) || '900'), 3600);

    if (!fileId) {
      throw new BadRequestError('File ID is required');
    }

    const file = (await DynamoDBService.get(tables.FILES, { fileId })) as File | null;

    if (!file || file.status === 'DELETED') {
      throw new NotFoundError('File not found');
    }

    LoggerUtil.debug('File access request', {
      lecturerId,
      fileId,
      fileLecturerId: file.lecturerId,
      fileModuleId: file.moduleId,
    });

    // Generate download URL
    const downloadUrl = await S3Service.generateDownloadUrl(file.s3Key, expiresIn, file.fileName);

    LoggerUtil.info('Download URL generated', {
      fileId,
      lecturerId,
      expiresIn,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        fileId,
        fileName: file.fileName,
        downloadUrl,
        expiresIn,
      })
    );
  });
}

/**
 * Enhanced version of handleListModuleFiles with additional fields and download URLs
 * GET /educator/modules/{moduleId}/files
 */
export async function handleListModuleFilesEnhanced(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getUserId(event);
    const moduleId = LambdaUtil.getPathParam(event, 'moduleId');
    const params = LambdaUtil.getQueryParams(event);
    const {
      limit = '20',
      offset = '0',
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
    } = params;

    if (!moduleId) {
      throw new BadRequestError('Module ID is required');
    }

    // Verify educator owns this module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module || !(module as any).lecturerIds?.includes(lecturerId)) {
      throw new ForbiddenError('You do not have access to this module');
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string) || 0;

    LoggerUtil.info('Querying module files', { moduleId, lecturerId });

    // Query files by moduleId GSI
    const result = await DynamoDBService.query(
      tables.FILES,
      'moduleId = :moduleId',
      { ':moduleId': moduleId },
      {
        indexName: 'moduleId-index',
        limit: limitNum + offsetNum,
        scanIndexForward: sortOrder === 'asc',
      }
    );

    let items = ((result.items || []).filter(
      (f: any) => f.status !== 'DELETED'
    ) as File[]);
    const totalCount = result.count || 0;

    // Apply sorting
    items = sortFiles(items, sortBy as string, sortOrder as string);

    // Apply pagination
    const paginatedItems = items.slice(offsetNum, offsetNum + limitNum);

    // Generate download URLs for each file
    const filesWithUrls = await Promise.all(
      paginatedItems.map(async (file) => {
        try {
          const downloadUrl = await S3Service.generateDownloadUrl(file.s3Key, 900);
          return {
            fileId: file.fileId,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            description: file.description,
            uploadedAt: file.uploadedAt,
            isPublished: file.isPublished,
            downloadUrl,
          };
        } catch (error) {
          LoggerUtil.warn('Failed to generate download URL', {
            fileId: file.fileId,
            error: (error as any).message,
          });
          return {
            fileId: file.fileId,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            description: file.description,
            uploadedAt: file.uploadedAt,
            isPublished: file.isPublished,
          };
        }
      })
    );

    LoggerUtil.info('Module files list retrieved', {
      moduleId,
      count: filesWithUrls.length,
      total: totalCount,
      lecturerId,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(
        filesWithUrls,
        Math.floor(offsetNum / limitNum),
        limitNum,
        totalCount
      )
    );
  });
}

/**
 * Helper function: Sort files array
 */
function sortFiles(
  files: File[],
  sortBy: string = 'uploadedAt',
  sortOrder: string = 'desc'
): File[] {
  const sorted = [...files].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortBy) {
      case 'uploadedAt':
        aVal = a.uploadedAt || 0;
        bVal = b.uploadedAt || 0;
        break;
      case 'fileName':
        aVal = a.fileName || '';
        bVal = b.fileName || '';
        break;
      case 'fileSize':
        aVal = a.fileSize || 0;
        bVal = b.fileSize || 0;
        break;
      case 'createdAt':
        aVal = a.createdAt || 0;
        bVal = b.createdAt || 0;
        break;
      default:
        aVal = a.uploadedAt || 0;
        bVal = b.uploadedAt || 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}
