import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { createFacultySchema, updateFacultySchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/error.util';
import { Faculty } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Normalize faculty data - handles both old and new schema formats
 */
function normalizeFaculty(fac: any): Faculty {
  return {
    facultyId: fac.facultyId,
    facultyName: fac.facultyName || fac.name,
    facultyCode: fac.facultyCode || fac.code,
    description: fac.description,
    createdAt: fac.createdAt,
    updatedAt: fac.updatedAt,
    createdBy: fac.createdBy,
  };
}

/**
 * GET /admin/faculties - List all faculties
 */
export async function handleListFaculties(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const { page, limit } = LambdaUtil.getPagination(event);
    const offset = (page - 1) * limit;

    const { items, count } = await DynamoDBService.scan(tables.FACULTIES, {
      limit: limit + 1,
    });

    const paginatedItems = items.slice(offset, offset + limit).map(normalizeFaculty);

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(paginatedItems, page, limit, count)
    );
  });
}

/**
 * POST /admin/faculties - Create a new faculty
 */
export async function handleCreateFaculty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);
    const userId = LambdaUtil.getUserId(event);

    // Validate input
    const input = createFacultySchema.parse(body);

    // Check for duplicate faculty code
    const existing = await DynamoDBService.scan(tables.FACULTIES, {
      filterExpression: 'facultyCode = :code',
      expressionAttributeValues: {
        ':code': input.facultyCode,
      },
    });

    if (existing.count > 0) {
      throw new ConflictError('Faculty code already exists');
    }

    // Generate faculty ID using UUID v4
    const facultyId = uuidv4();

    // Create faculty
    const faculty: Faculty = {
      facultyId,
      facultyName: input.facultyName,
      facultyCode: input.facultyCode,
      description: input.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    };

    await DynamoDBService.put(tables.FACULTIES, faculty);

    LoggerUtil.info('Faculty created', { facultyId: faculty.facultyId });

    return ResponseUtil.lambdaResponse(201, ResponseUtil.success(normalizeFaculty(faculty)));
  });
}

/**
 * GET /admin/faculties/{id} - Get faculty by ID
 */
export async function handleGetFaculty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const facultyId = LambdaUtil.getPathParam(event, 'id');

    if (!facultyId) {
      throw new BadRequestError('Faculty ID is required');
    }

    const faculty = await DynamoDBService.get(tables.FACULTIES, { facultyId });

    if (!faculty) {
      throw new NotFoundError('Faculty not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeFaculty(faculty)));
  });
}

/**
 * PUT /admin/faculties/{id} - Update faculty
 */
export async function handleUpdateFaculty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const facultyId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!facultyId) {
      throw new BadRequestError('Faculty ID is required');
    }

    // Validate input
    const input = updateFacultySchema.parse(body);

    // Check if faculty exists
    const existing = await DynamoDBService.get(tables.FACULTIES, { facultyId });

    if (!existing) {
      throw new NotFoundError('Faculty not found');
    }

    // Check for duplicate faculty code if code is being updated
    if (input.facultyCode && input.facultyCode !== existing.facultyCode) {
      const duplicate = await DynamoDBService.scan(tables.FACULTIES, {
        filterExpression: 'facultyCode = :code AND facultyId <> :id',
        expressionAttributeValues: {
          ':code': input.facultyCode,
          ':id': facultyId,
        },
      });

      if (duplicate.count > 0) {
        throw new ConflictError('Faculty code already exists');
      }
    }

    // Prepare update object
    const updates: any = {
      ...input,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const updated = await DynamoDBService.update(tables.FACULTIES, { facultyId }, updates);

    LoggerUtil.info('Faculty updated', { facultyId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeFaculty(updated)));
  });
}

/**
 * DELETE /admin/faculties/{id} - Delete faculty
 */
export async function handleDeleteFaculty(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const facultyId = LambdaUtil.getPathParam(event, 'id');

    if (!facultyId) {
      throw new BadRequestError('Faculty ID is required');
    }

    const existing = await DynamoDBService.get(tables.FACULTIES, { facultyId });

    if (!existing) {
      throw new NotFoundError('Faculty not found');
    }

    await DynamoDBService.delete(tables.FACULTIES, { facultyId });

    LoggerUtil.info('Faculty deleted', { facultyId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({ message: 'Faculty deleted successfully' })
    );
  });
}
