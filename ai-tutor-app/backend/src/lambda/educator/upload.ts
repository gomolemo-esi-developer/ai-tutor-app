import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Service } from '../../services/s3.service';
import { DynamoDBService } from '../../services/dynamodb.service';
import { getRagService } from '../../services/rag.service';
import { DatabaseConfig } from '../../config/database.config';
import { uploadFileSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { File } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * POST /educator/upload/url - Generate presigned upload URL
 */
export async function handleGenerateUploadUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const body = LambdaUtil.parseBody(event);

    if (!lecturerId) {
      throw new BadRequestError('Lecturer ID is required');
    }

    // Validate input
    const input = uploadFileSchema.parse(body);

    // Generate S3 key
    const fileId = UuidUtil.generateFileId();
    const s3Key = S3Service.generateS3Key(lecturerId, fileId, input.fileName);

    // Generate upload URL
    const uploadUrl = await S3Service.generateUploadUrl(s3Key, 900); // 15 minute expiry

    // Store file metadata
    const file: File = {
      fileId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      lecturerId,
      moduleId: input.moduleId,
      s3Key,
      s3Bucket: S3Service.getBucket(),
      mimeType: input.mimeType,
      uploadedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: lecturerId,
      status: 'ACTIVE',
      ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours in Unix seconds
    };

    await DynamoDBService.put(tables.FILES, file);

    LoggerUtil.info('Upload URL generated', { fileId, lecturerId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        fileId,
        uploadUrl,
        s3Key,
        expiresIn: 900,
      })
    );
  });
}

/**
 * GET /educator/upload/{fileId} - Get file download URL
 */
export async function handleGenerateDownloadUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const fileId = LambdaUtil.getPathParam(event, 'fileId');

    if (!fileId) {
      throw new BadRequestError('File ID is required');
    }

    // Get file metadata
    const file = await DynamoDBService.get(tables.FILES, { fileId });

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Generate download URL
    const downloadUrl = await S3Service.generateDownloadUrl(file.s3Key, 900, file.fileName); // 15 minute expiry

    LoggerUtil.info('Download URL generated', { fileId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        fileId,
        fileName: file.fileName,
        downloadUrl,
        expiresIn: 900,
      })
    );
  });
}

/**
 * DELETE /educator/upload/{fileId} - Delete file
 */
export async function handleDeleteFile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const fileId = LambdaUtil.getPathParam(event, 'fileId');

    if (!lecturerId || !fileId) {
      throw new BadRequestError('Lecturer ID and File ID are required');
    }

    // Get file metadata
    const file = await DynamoDBService.get(tables.FILES, { fileId });

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Verify ownership
    if (file.lecturerId !== lecturerId) {
      throw new ForbiddenError('You do not have permission to delete this file');
    }

    // Delete from S3
    await S3Service.deleteFile(file.s3Key);

    // Delete metadata
    await DynamoDBService.delete(tables.FILES, { fileId });

    LoggerUtil.info('File deleted', { fileId, lecturerId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success({}, 'File deleted'));
  });
}

/**
 * GET /educator/modules/{moduleId}/files - List module files
 */
export async function handleListModuleFiles(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const moduleId = LambdaUtil.getPathParam(event, 'moduleId');
    const { page, limit } = LambdaUtil.getPagination(event);

    if (!moduleId) {
      throw new BadRequestError('Module ID is required');
    }

    // Query files by module
    const { items, count } = await DynamoDBService.query(
      tables.FILES,
      'moduleId = :moduleId',
      { ':moduleId': moduleId },
      { indexName: 'moduleId_gsi', limit }
    );

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(items, page, limit, count || items.length)
    );
  });
}
