import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../services/dynamodb.service';
import { S3Service } from '../../services/s3.service';
import { DatabaseConfig } from '../../config/database.config';
import { createModuleSchema, updateModuleSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError } from '../../utils/error.util';
import { Module } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Normalize module data - handles both old and new schema formats
 */
function normalizeModule(module: any): Module {
  const normalized: Module = {
    moduleId: module.moduleId,
    moduleName: module.moduleName || module.name,
    moduleCode: module.moduleCode || module.code,
    description: module.description,
    courseId: module.courseId,
    departmentId: module.departmentId,
    status: module.status,
    studentCount: module.studentCount || 0,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
    createdBy: module.createdBy,
  };
  
  // Only include lecturerIds if present
  if (module.lecturerIds) {
    normalized.lecturerIds = module.lecturerIds;
  }
  
  return normalized;
}

/**
 * GET /admin/modules - List all modules
 */
export async function handleListModules(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const { page, limit } = LambdaUtil.getPagination(event);
    const offset = (page - 1) * limit;

    const { items, count } = await DynamoDBService.scan(tables.MODULES, {
      limit: limit + 1,
    });

    const paginatedItems = items.slice(offset, offset + limit).map(normalizeModule);

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(paginatedItems, page, limit, count)
    );
  });
}

/**
 * POST /admin/modules - Create a new module
 */
export async function handleCreateModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    try {
      const body = LambdaUtil.parseBody(event);
      LoggerUtil.info('Create module request body', { body });

      // Validate input
      let input;
      try {
        input = createModuleSchema.parse(body);
        LoggerUtil.info('Module schema validation passed', { input });
      } catch (validationError) {
        LoggerUtil.error('Module validation failed', validationError as Error);
        throw validationError;
      }

      // Generate module ID using UUID v4
      const moduleId = uuidv4();
      LoggerUtil.info('Generated moduleId', { moduleId });

      // Create module with correct schema
      const now = Date.now();
      const module: Module = {
        moduleId,
        moduleName: input.moduleName,
        moduleCode: input.moduleCode,
        description: input.description,
        courseId: input.courseId,
        departmentId: input.departmentId,
        status: 'DRAFT',
        studentCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: 'admin',
      };

      // Remove undefined fields before storing in DynamoDB
      const moduleForStorage = Object.fromEntries(
        Object.entries(module).filter(([, value]) => value !== undefined)
      );

      LoggerUtil.info('Module object for storage', { moduleForStorage });
      await DynamoDBService.put(tables.MODULES, moduleForStorage);
      LoggerUtil.info('Module created successfully', { moduleId: module.moduleId, moduleCode: input.moduleCode });

      return ResponseUtil.lambdaResponse(201, ResponseUtil.success(normalizeModule(module)));
    } catch (error) {
      LoggerUtil.error('Unexpected error in handleCreateModule', error as Error);
      throw error;
    }
  });
}

/**
 * GET /admin/modules/{id} - Get module by ID
 */
export async function handleGetModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const moduleId = LambdaUtil.getPathParam(event, 'id');

    if (!moduleId) {
      throw new BadRequestError('Module ID is required');
    }

    const module = await DynamoDBService.get(tables.MODULES, { moduleId });

    if (!module) {
      throw new NotFoundError('Module not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeModule(module)));
  });
}

/**
 * PUT /admin/modules/{id} - Update module
 */
export async function handleUpdateModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const moduleId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!moduleId) {
      throw new BadRequestError('Module ID is required');
    }

    // Validate input
    const input = updateModuleSchema.parse(body);

    // Update module
    const now = Date.now();
    const updated = await DynamoDBService.update(
      tables.MODULES,
      { moduleId },
      {
        ...input,
        updatedAt: now,
      }
    );

    LoggerUtil.info('Module updated', { moduleId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeModule(updated)));
  });
}

/**
 * DELETE /admin/modules/{id} - Delete module with cascade delete
 * 
 * Cascade delete process:
 * 1. Verify module exists
 * 2. Query all files associated with this module
 * 3. Delete S3 objects for all files
 * 4. Delete file records from DynamoDB
 * 5. Delete module from DynamoDB
 * 
 * Rollback: If any file deletion fails, logs error but continues
 * (to prevent orphaned modules blocking deletion)
 */
export async function handleDeleteModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const moduleId = LambdaUtil.getPathParam(event, 'id');

    if (!moduleId) {
      throw new BadRequestError('Module ID is required');
    }

    // Step 1: Verify module exists
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    LoggerUtil.info('Starting module deletion cascade', { moduleId, moduleName: module.moduleName });

    let deletedFilesCount = 0;
    let s3DeletionErrors = 0;

    // Step 2: Query all files associated with this module
    try {
      const { items: files } = await DynamoDBService.query(
        tables.FILES,
        'moduleId = :moduleId',
        { ':moduleId': moduleId },
        { indexName: 'moduleId_gsi' }
      );

      if (files && files.length > 0) {
        LoggerUtil.info('Found files to delete', { moduleId, fileCount: files.length });

        // Step 3: Delete S3 objects and DynamoDB records
        for (const file of files) {
          try {
            // Delete from S3 if s3Key exists
            if (file.s3Key) {
              try {
                await S3Service.deleteFile(file.s3Key);
                LoggerUtil.debug('S3 file deleted', { s3Key: file.s3Key, fileId: file.fileId });
              } catch (s3Error) {
                s3DeletionErrors++;
                LoggerUtil.warn('Failed to delete S3 file (continuing cascade)', {
                  s3Key: file.s3Key,
                  fileId: file.fileId,
                  error: s3Error instanceof Error ? s3Error.message : 'Unknown error',
                });
              }
            }

            // Delete from DynamoDB
            await DynamoDBService.delete(tables.FILES, { fileId: file.fileId });
            LoggerUtil.debug('File metadata deleted', { fileId: file.fileId });
            deletedFilesCount++;
          } catch (fileError) {
            LoggerUtil.error('Failed to delete file record', {
              fileId: file.fileId,
              error: fileError instanceof Error ? fileError.message : 'Unknown error',
            });
            // Continue to next file instead of failing entire operation
          }
        }

        if (deletedFilesCount > 0) {
          LoggerUtil.info('Cascade delete completed for files', {
            moduleId,
            deletedFilesCount,
            s3DeletionErrors,
          });
        }
      }
    } catch (queryError) {
      LoggerUtil.warn('Failed to query files for cascade delete', {
        moduleId,
        error: queryError instanceof Error ? queryError.message : 'Unknown error',
      });
      // Continue with module deletion even if file query fails
    }

    // Step 4: Delete module from DynamoDB
    await DynamoDBService.delete(tables.MODULES, { moduleId });

    LoggerUtil.info('Module deleted with cascade', {
      moduleId,
      moduleName: module.moduleName,
      filesDeleted: deletedFilesCount,
      s3Errors: s3DeletionErrors,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(
        {
          moduleId,
          deletedFilesCount,
          message: s3DeletionErrors > 0
            ? `Module deleted with ${deletedFilesCount} files. ${s3DeletionErrors} S3 deletions failed but were logged.`
            : `Module deleted with ${deletedFilesCount} associated files.`,
        },
        'Module and associated files deleted successfully'
      )
    );
  });
}

/**
 * GET /admin/modules/lecturer/{lecturerId} - Get modules by lecturer
 */
export async function handleGetModulesByLecturer(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const { page, limit } = LambdaUtil.getPagination(event);

    if (!lecturerId) {
      throw new BadRequestError('Lecturer ID is required');
    }

    const { items, count } = await DynamoDBService.query(
      tables.MODULES,
      'lecturerId = :lecturerId',
      { ':lecturerId': lecturerId },
      { indexName: 'lecturerId_gsi', limit }
    );

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(items.map(normalizeModule), page, limit, count || items.length)
    );
  });
}

/**
 * POST /admin/modules/{id}/enroll - Enroll student in module
 */
export async function handleEnrollModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const moduleId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);
    const studentId = body.studentId;

    if (!moduleId) {
      throw new BadRequestError('Module ID is required');
    }

    if (!studentId) {
      throw new BadRequestError('Student ID is required');
    }

    // Get module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    // Update module enrollment
    const enrolledStudents = (module.enrolledStudents || 0) + 1;
    const updated = await DynamoDBService.update(
      tables.MODULES,
      { moduleId },
      { enrolledStudents }
    );

    // Update student modules
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    if (student) {
      const modules = student.enrolledModules || [];
      if (!modules.includes(moduleId)) {
        modules.push(moduleId);
        await DynamoDBService.update(
          tables.STUDENTS,
          { studentId },
          { enrolledModules: modules }
        );
      }
    }

    LoggerUtil.info('Student enrolled in module', { moduleId, studentId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(normalizeModule(updated), 'Student enrolled successfully')
    );
  });
}
