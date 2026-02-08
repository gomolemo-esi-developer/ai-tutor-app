import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { createCampusSchema, updateCampusSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/error.util';
import { Campus } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Normalize campus data - handles both old and new schema formats
 */
function normalizeCampus(camp: any): Campus {
  return {
    campusId: camp.campusId,
    campusName: camp.campusName || camp.name,
    campusCode: camp.campusCode || camp.code,
    location: camp.location,
    address: camp.address,
    city: camp.city,
    phone: camp.phone,
    email: camp.email,
    createdAt: camp.createdAt,
    updatedAt: camp.updatedAt,
    createdBy: camp.createdBy,
  };
}

/**
 * GET /admin/campuses - List all campuses
 */
export async function handleListCampuses(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const { page, limit } = LambdaUtil.getPagination(event);
    const offset = (page - 1) * limit;

    const { items, count } = await DynamoDBService.scan(tables.CAMPUSES, {
      limit: limit + 1,
    });

    const paginatedItems = items.slice(offset, offset + limit).map(normalizeCampus);

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(paginatedItems, page, limit, count)
    );
  });
}

/**
 * POST /admin/campuses - Create a new campus
 */
export async function handleCreateCampus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);
    const userId = LambdaUtil.getUserId(event);

    // Validate input
    const input = createCampusSchema.parse(body);

    // Check for duplicate campus code
    const existing = await DynamoDBService.scan(tables.CAMPUSES, {
      filterExpression: 'campusCode = :code',
      expressionAttributeValues: {
        ':code': input.campusCode,
      },
    });

    if (existing.count > 0) {
      throw new ConflictError('Campus code already exists');
    }

    // Generate campus ID using UUID v4
    const campusId = uuidv4();

    // Create campus
    const campus: Campus = {
      campusId,
      campusName: input.campusName,
      campusCode: input.campusCode,
      location: input.location,
      address: input.address,
      city: input.city,
      phone: input.phone,
      email: input.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    };

    await DynamoDBService.put(tables.CAMPUSES, campus);

    LoggerUtil.info('Campus created', { campusId: campus.campusId });

    return ResponseUtil.lambdaResponse(201, ResponseUtil.success(normalizeCampus(campus)));
  });
}

/**
 * GET /admin/campuses/{id} - Get campus by ID
 */
export async function handleGetCampus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const campusId = LambdaUtil.getPathParam(event, 'id');

    if (!campusId) {
      throw new BadRequestError('Campus ID is required');
    }

    const campus = await DynamoDBService.get(tables.CAMPUSES, { campusId });

    if (!campus) {
      throw new NotFoundError('Campus not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeCampus(campus)));
  });
}

/**
 * PUT /admin/campuses/{id} - Update campus
 */
export async function handleUpdateCampus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const campusId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!campusId) {
      throw new BadRequestError('Campus ID is required');
    }

    // Validate input
    const input = updateCampusSchema.parse(body);

    // Check if campus exists
    const existing = await DynamoDBService.get(tables.CAMPUSES, { campusId });

    if (!existing) {
      throw new NotFoundError('Campus not found');
    }

    // Check for duplicate campus code if code is being updated
    if (input.campusCode && input.campusCode !== existing.campusCode) {
      const duplicate = await DynamoDBService.scan(tables.CAMPUSES, {
        filterExpression: 'campusCode = :code AND campusId <> :id',
        expressionAttributeValues: {
          ':code': input.campusCode,
          ':id': campusId,
        },
      });

      if (duplicate.count > 0) {
        throw new ConflictError('Campus code already exists');
      }
    }

    // Prepare update object
    const updates: any = {
      ...input,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const updated = await DynamoDBService.update(tables.CAMPUSES, { campusId }, updates);

    LoggerUtil.info('Campus updated', { campusId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeCampus(updated)));
  });
}

/**
 * DELETE /admin/campuses/{id} - Delete campus
 */
export async function handleDeleteCampus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const campusId = LambdaUtil.getPathParam(event, 'id');

    if (!campusId) {
      throw new BadRequestError('Campus ID is required');
    }

    const existing = await DynamoDBService.get(tables.CAMPUSES, { campusId });

    if (!existing) {
      throw new NotFoundError('Campus not found');
    }

    await DynamoDBService.delete(tables.CAMPUSES, { campusId });

    LoggerUtil.info('Campus deleted', { campusId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({ message: 'Campus deleted successfully' })
    );
  });
}
