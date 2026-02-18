import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { createLecturerSchema, updateLecturerSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { Lecturer } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Normalize lecturer data - handles both old and new schema formats
 */
function normalizeLecturer(lecturer: any): Lecturer {
  return {
    lecturerId: lecturer.lecturerId,
    userId: lecturer.userId,
    staffNumber: lecturer.staffNumber,
    email: lecturer.email,
    firstName: lecturer.firstName,
    lastName: lecturer.lastName,
    title: lecturer.title,
    departmentId: lecturer.departmentId,
    campusId: lecturer.campusId,
    moduleIds: lecturer.moduleIds || [],
    registrationStatus: lecturer.registrationStatus,
    phone: lecturer.phone,
    officeLocation: lecturer.officeLocation,
    bio: lecturer.bio,
    createdAt: lecturer.createdAt,
    updatedAt: lecturer.updatedAt,
    createdBy: lecturer.createdBy,
  };
}

/**
 * GET /admin/lecturers - List all lecturers
 */
export async function handleListLecturers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const { page, limit } = LambdaUtil.getPagination(event);
    const offset = (page - 1) * limit;

    const { items, count } = await DynamoDBService.scan(tables.LECTURERS, {
      limit: limit + 1,
    });

    const paginatedItems = items.slice(offset, offset + limit).map(normalizeLecturer);

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(paginatedItems, page, limit, count)
    );
  });
}

/**
 * POST /admin/lecturers - Create a new lecturer
 */
export async function handleCreateLecturer(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    // Validate input
    const input = createLecturerSchema.parse(body);

    // Create lecturer with correct schema
    const now = Date.now();
    const lecturer: Lecturer = {
      lecturerId: UuidUtil.generateWithPrefix('lecturer'),
      userId: UuidUtil.generateWithPrefix('user'),
      staffNumber: input.staffNumber,
      email: input.email,
      title: input.title,
      departmentId: input.departmentId,
      campusId: input.campusId,
      moduleIds: input.moduleIds || [],
      registrationStatus: 'PENDING',
      phone: input.phone,
      officeLocation: input.officeLocation,
      bio: input.bio,
      createdAt: now,
      updatedAt: now,
      createdBy: 'admin', // Could use userId from auth context
    };

    await DynamoDBService.put(tables.LECTURERS, lecturer);

    LoggerUtil.info('Lecturer created', { lecturerId: lecturer.lecturerId, staffNumber: input.staffNumber });

    return ResponseUtil.lambdaResponse(201, ResponseUtil.success(normalizeLecturer(lecturer)));
  });
}

/**
 * GET /admin/lecturers/{id} - Get lecturer by ID
 */
export async function handleGetLecturer(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'id');

    if (!lecturerId) {
      throw new BadRequestError('Lecturer ID is required');
    }

    const lecturer = await DynamoDBService.get(tables.LECTURERS, { lecturerId });

    if (!lecturer) {
      throw new NotFoundError('Lecturer not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeLecturer(lecturer)));
  });
}

/**
 * PUT /admin/lecturers/{id} - Update lecturer
 */
export async function handleUpdateLecturer(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!lecturerId) {
      throw new BadRequestError('Lecturer ID is required');
    }

    // Validate input
    const input = updateLecturerSchema.parse(body);

    // Update lecturer
    const now = Date.now();
    const updated = await DynamoDBService.update(
      tables.LECTURERS,
      { lecturerId },
      {
        ...input,
        updatedAt: now,
      }
    );

    LoggerUtil.info('Lecturer updated', { lecturerId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeLecturer(updated)));
  });
}

/**
 * DELETE /admin/lecturers/{id} - Delete lecturer
 */
export async function handleDeleteLecturer(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'id');

    if (!lecturerId) {
      throw new BadRequestError('Lecturer ID is required');
    }

    // Verify lecturer exists
    const lecturer = await DynamoDBService.get(tables.LECTURERS, { lecturerId });
    if (!lecturer) {
      throw new NotFoundError('Lecturer not found');
    }

    // Delete lecturer
    await DynamoDBService.delete(tables.LECTURERS, { lecturerId });

    LoggerUtil.info('Lecturer deleted', { lecturerId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success({}, 'Lecturer deleted'));
  });
}

/**
 * GET /admin/lecturers/user/{userId} - Get lecturer by user ID
 */
export async function handleGetLecturerByUserId(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getPathParam(event, 'userId');

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const { items } = await DynamoDBService.query(
      tables.LECTURERS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    if (!items || items.length === 0) {
      throw new NotFoundError('Lecturer not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeLecturer(items[0])));
  });
}
