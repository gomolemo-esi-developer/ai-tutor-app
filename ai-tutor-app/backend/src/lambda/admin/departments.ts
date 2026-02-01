import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { createDepartmentSchema, updateDepartmentSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/error.util';
import { Department } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Normalize department data - handles both old and new schema formats
 */
function normalizeDepartment(dept: any): Department {
  return {
    departmentId: dept.departmentId,
    departmentName: dept.departmentName || dept.name,
    departmentCode: dept.departmentCode || dept.code,
    description: dept.description,
    facultyId: dept.facultyId,
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt,
    createdBy: dept.createdBy,
  };
}

/**
 * GET /admin/departments - List all departments
 */
export async function handleListDepartments(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const { page, limit } = LambdaUtil.getPagination(event);
    const offset = (page - 1) * limit;

    const { items, count } = await DynamoDBService.scan(tables.DEPARTMENTS, {
      limit: limit + 1,
    });

    const paginatedItems = items.slice(offset, offset + limit).map(normalizeDepartment);

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(paginatedItems, page, limit, count)
    );
  });
}

/**
 * POST /admin/departments - Create a new department
 */
export async function handleCreateDepartment(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);
    const userId = LambdaUtil.getUserId(event);

    // Validate input
    const input = createDepartmentSchema.parse(body);

    // Check for duplicate department code
    const existing = await DynamoDBService.scan(tables.DEPARTMENTS, {
      filterExpression: 'departmentCode = :code',
      expressionAttributeValues: {
        ':code': input.departmentCode,
      },
    });

    if (existing.count > 0) {
      throw new ConflictError('Department code already exists');
    }

    // Generate department ID using UUID v4
    const departmentId = uuidv4();

    // Create department
    const department: Department = {
      departmentId,
      departmentName: input.departmentName,
      departmentCode: input.departmentCode,
      description: input.description,
      facultyId: input.facultyId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    };

    await DynamoDBService.put(tables.DEPARTMENTS, department);

    LoggerUtil.info('Department created', { departmentId: department.departmentId });

    return ResponseUtil.lambdaResponse(201, ResponseUtil.success(normalizeDepartment(department)));
  });
}

/**
 * GET /admin/departments/{id} - Get department by ID
 */
export async function handleGetDepartment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const departmentId = LambdaUtil.getPathParam(event, 'id');

    if (!departmentId) {
      throw new BadRequestError('Department ID is required');
    }

    const department = await DynamoDBService.get(tables.DEPARTMENTS, { departmentId });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeDepartment(department)));
  });
}

/**
 * PUT /admin/departments/{id} - Update department
 */
export async function handleUpdateDepartment(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const departmentId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!departmentId) {
      throw new BadRequestError('Department ID is required');
    }

    // Validate input
    const input = updateDepartmentSchema.parse(body);

    // Check if department exists
    const existing = await DynamoDBService.get(tables.DEPARTMENTS, { departmentId });

    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    // Check for duplicate department code if code is being updated
    if (input.departmentCode && input.departmentCode !== existing.departmentCode) {
      const duplicate = await DynamoDBService.scan(tables.DEPARTMENTS, {
        filterExpression: 'departmentCode = :code AND departmentId <> :id',
        expressionAttributeValues: {
          ':code': input.departmentCode,
          ':id': departmentId,
        },
      });

      if (duplicate.count > 0) {
        throw new ConflictError('Department code already exists');
      }
    }

    // Prepare update object
    const updates: any = {
      ...input,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const updated = await DynamoDBService.update(tables.DEPARTMENTS, { departmentId }, updates);

    LoggerUtil.info('Department updated', { departmentId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeDepartment(updated)));
  });
}

/**
 * DELETE /admin/departments/{id} - Delete department
 */
export async function handleDeleteDepartment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const departmentId = LambdaUtil.getPathParam(event, 'id');

    if (!departmentId) {
      throw new BadRequestError('Department ID is required');
    }

    const existing = await DynamoDBService.get(tables.DEPARTMENTS, { departmentId });

    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    await DynamoDBService.delete(tables.DEPARTMENTS, { departmentId });

    LoggerUtil.info('Department deleted', { departmentId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({ message: 'Department deleted successfully' })
    );
  });
}
