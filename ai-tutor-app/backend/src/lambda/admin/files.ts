/**
 * Admin Files Handler - File metadata management (CRUD operations)
 * Handles: list, get, create, update, delete, bulk upload
 *
 * Part of Phase 3C: Files Table Backend Configuration
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import {
  createFileMetadataSchema,
  updateFileMetadataSchema,
  bulkUploadFilesSchema,
} from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError, NotFoundError, ValidationError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { File } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * GET /admin/files - List all files with filters and pagination
 * Supports filtering by moduleId, lecturerId, status
 * Supports sorting by uploadedAt, createdAt, fileName
 */
export async function handleListFiles(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const params = LambdaUtil.getQueryParams(event);
    const {
      moduleId,
      lecturerId,
      status,
      limit = '20',
      offset = '0',
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
    } = params;

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string) || 0;

    let items: File[] = [];
    let totalCount = 0;

    // Query by moduleId GSI
    if (moduleId && typeof moduleId === 'string') {
      LoggerUtil.info('Querying files by moduleId', { moduleId });
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
      items = (result.items || []) as File[];
      totalCount = result.count || 0;
    }
    // Query by lecturerId GSI
    else if (lecturerId && typeof lecturerId === 'string') {
      LoggerUtil.info('Querying files by lecturerId', { lecturerId });
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
      items = (result.items || []) as File[];
      totalCount = result.count || 0;
    }
    // Scan all files
    else {
      LoggerUtil.info('Scanning all files');
      const result = await DynamoDBService.scan(tables.FILES, {
        limit: limitNum + offsetNum,
      });
      items = (result.items || []) as File[];
      totalCount = result.count || 0;
    }

    // Filter by status if provided, otherwise exclude DELETED files
    if (status && typeof status === 'string') {
      items = items.filter((f) => f.status === status);
    } else {
      // By default, exclude deleted files
      items = items.filter((f) => f.status !== 'DELETED');
    }

    // Apply sorting
    items = sortFiles(items, sortBy as string, sortOrder as string);

    // Apply pagination
    const paginatedItems = items.slice(offsetNum, offsetNum + limitNum);

    LoggerUtil.info('Files list retrieved', {
      count: paginatedItems.length,
      total: totalCount,
      limit: limitNum,
      offset: offsetNum,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(
        paginatedItems,
        Math.floor(offsetNum / limitNum),
        limitNum,
        totalCount
      )
    );
  });
}

/**
 * GET /admin/files/{fileId} - Get file metadata details
 */
export async function handleGetFile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const fileId = LambdaUtil.getPathParam(event, 'fileId');

    if (!fileId) {
      throw new BadRequestError('File ID is required');
    }

    const file = (await DynamoDBService.get(tables.FILES, { fileId })) as File | null;

    if (!file || file.status === 'DELETED') {
      throw new NotFoundError('File not found');
    }

    LoggerUtil.info('File retrieved', { fileId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(file));
  });
}

/**
 * POST /admin/files - Create file metadata
 * Note: This creates metadata only. Actual file upload is done via S3 presigned URL.
 */
export async function handleCreateFile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const body = LambdaUtil.parseBody(event);

    // Validate input
    let input;
    try {
      input = createFileMetadataSchema.parse(body);
    } catch (error: any) {
      throw new ValidationError('Invalid file metadata', error.errors);
    }

    // Verify module exists
    const module = await DynamoDBService.get(tables.MODULES, {
      moduleId: input.moduleId,
    });
    if (!module) {
      throw new BadRequestError('Module not found');
    }

    // Verify lecturer exists
    const lecturer = await DynamoDBService.get(tables.LECTURERS, {
      lecturerId: input.lecturerId,
    });
    if (!lecturer) {
      throw new BadRequestError('Lecturer not found');
    }

    // Create file metadata
    const fileId = UuidUtil.generateFileId();
    const now = Date.now();
    const s3Bucket = `aitutor-files-${process.env.ENVIRONMENT || 'development'}`;
    const s3Key = `modules/${input.moduleId}/${now}-${fileId}`;

    const file: File = {
      fileId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      moduleId: input.moduleId,
      lecturerId: input.lecturerId,
      description: input.description,
      accessLevel: input.accessLevel || 'MODULE_ONLY',
      isPublished: input.isPublished !== false,
      tags: input.tags || [],
      status: 'ACTIVE',
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      s3Key,
      s3Bucket,
      ...(input.duration && { duration: input.duration }),
      ...(input.pages && { pages: input.pages }),
    };

    await DynamoDBService.put(tables.FILES, file);

    LoggerUtil.info('File metadata created', {
      fileId,
      moduleId: input.moduleId,
      createdBy: userId,
    });

    return ResponseUtil.lambdaResponse(
      201,
      ResponseUtil.success(file, 'File metadata created successfully')
    );
  });
}

/**
 * PUT /admin/files/{fileId} - Update file metadata
 */
export async function handleUpdateFile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
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

    // Validate input
    let input;
    try {
      input = updateFileMetadataSchema.parse(body);
    } catch (error: any) {
      throw new ValidationError('Invalid update data', error.errors);
    }

    // Update file
    const updates = {
      ...input,
      updatedAt: Date.now(),
      modifiedBy: userId,
    };

    await DynamoDBService.update(tables.FILES, { fileId }, updates);

    LoggerUtil.info('File metadata updated', {
      fileId,
      updatedBy: userId,
      fields: Object.keys(input),
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(updates, 'File updated successfully')
    );
  });
}

/**
 * DELETE /admin/files/{fileId} - Delete file (soft delete)
 * Marks file as DELETED instead of hard delete for audit trail
 */
export async function handleDeleteFile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const fileId = LambdaUtil.getPathParam(event, 'fileId');

    if (!fileId) {
      throw new BadRequestError('File ID is required');
    }

    const file = (await DynamoDBService.get(tables.FILES, { fileId })) as File | null;
    if (!file || file.status === 'DELETED') {
      throw new NotFoundError('File not found');
    }

    // Soft delete
    await DynamoDBService.update(tables.FILES, { fileId }, {
      status: 'DELETED',
      updatedAt: Date.now(),
    });

    LoggerUtil.info('File deleted', { fileId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({ fileId, status: 'DELETED' }, 'File deleted successfully')
    );
  });
}

/**
 * POST /admin/files/bulk - Bulk create file metadata
 * Used for importing multiple files at once
 */
export async function handleBulkUploadFiles(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const body = LambdaUtil.parseBody(event);

    // Validate input
    let input;
    try {
      input = bulkUploadFilesSchema.parse(body);
    } catch (error: any) {
      throw new ValidationError('Invalid bulk upload data', error.errors);
    }

    if (!input.files || input.files.length === 0) {
      throw new BadRequestError('At least one file is required');
    }

    if (input.files.length > 100) {
      throw new BadRequestError('Maximum 100 files per bulk upload');
    }

    const s3Bucket = `aitutor-files-${process.env.ENVIRONMENT || 'development'}`;
    const now = Date.now();
    const createdFiles: File[] = [];
    const errors: any[] = [];

    for (let i = 0; i < input.files.length; i++) {
      try {
        const fileData = input.files[i];

        // Verify module exists
        const module = await DynamoDBService.get(tables.MODULES, {
          moduleId: fileData.moduleId,
        });
        if (!module) {
          errors.push({
            index: i,
            error: 'Module not found',
            data: fileData,
          });
          continue;
        }

        // Verify lecturer exists
        const lecturer = await DynamoDBService.get(tables.LECTURERS, {
          lecturerId: fileData.lecturerId,
        });
        if (!lecturer) {
          errors.push({
            index: i,
            error: 'Lecturer not found',
            data: fileData,
          });
          continue;
        }

        // Create file metadata
        const fileId = UuidUtil.generateFileId();
        const s3Key = `modules/${fileData.moduleId}/${now}-${fileId}`;

        const file: File = {
          fileId,
          fileName: fileData.fileName,
          fileType: fileData.fileType,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          moduleId: fileData.moduleId,
          lecturerId: fileData.lecturerId,
          description: fileData.description,
          accessLevel: fileData.accessLevel || 'MODULE_ONLY',
          isPublished: fileData.isPublished !== false,
          tags: fileData.tags || [],
          status: 'ACTIVE',
          uploadedAt: now,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          s3Key,
          s3Bucket,
          ...(fileData.duration && { duration: fileData.duration }),
          ...(fileData.pages && { pages: fileData.pages }),
        };

        await DynamoDBService.put(tables.FILES, file);
        createdFiles.push(file);
      } catch (error: any) {
        LoggerUtil.error('Error creating file in bulk upload', {
          index: i,
          error: error.message,
        });
        errors.push({
          index: i,
          error: error.message,
          data: input.files[i],
        });
      }
    }

    LoggerUtil.info('Bulk file upload completed', {
      created: createdFiles.length,
      failed: errors.length,
      total: input.files.length,
      createdBy: userId,
    });

    return ResponseUtil.lambdaResponse(
      201,
      ResponseUtil.success(
        {
          created: createdFiles.length,
          failed: errors.length,
          total: input.files.length,
          files: createdFiles,
          ...(errors.length > 0 && { errors }),
        },
        `${createdFiles.length} files created successfully${
          errors.length > 0 ? ` (${errors.length} failed)` : ''
        }`
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
      case 'createdAt':
        aVal = a.createdAt || 0;
        bVal = b.createdAt || 0;
        break;
      case 'fileName':
        aVal = a.fileName || '';
        bVal = b.fileName || '';
        break;
      case 'fileSize':
        aVal = a.fileSize || 0;
        bVal = b.fileSize || 0;
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
