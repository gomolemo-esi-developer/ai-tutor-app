import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';

const tables = DatabaseConfig.getTables();

/**
 * Enrich module with department info and add default thumbnail
 */
async function enrichModuleData(module: any) {
  if (!module) return module;
  
  let departmentName = 'N/A';
  
  // Fetch department if departmentId exists
  if (module.departmentId) {
    try {
      const dept = await DynamoDBService.get(tables.DEPARTMENTS, { departmentId: module.departmentId });
      if (dept) {
        departmentName = dept.departmentName || 'N/A';
        LoggerUtil.info('Department found for module', { moduleId: module.moduleId, departmentId: module.departmentId, departmentName });
      } else {
        LoggerUtil.warn('Department not found for module', { moduleId: module.moduleId, departmentId: module.departmentId });
      }
    } catch (err) {
      LoggerUtil.warn('Failed to fetch department', { moduleId: module.moduleId, departmentId: module.departmentId, error: err });
    }
  } else {
    LoggerUtil.info('Module has no departmentId', { moduleId: module.moduleId });
  }
  
  return {
    ...module,
    // Normalize field names for frontend compatibility
    title: module.moduleName,
    code: module.moduleCode,
    name: module.moduleName,
    department: departmentName,
    departmentName: departmentName,
    // Add default thumbnail if not present
    thumbnail: module.thumbnail || `https://via.placeholder.com/400x200?text=${encodeURIComponent(module.moduleCode || 'Module')}`
  };
}

/**
 * GET /api/student/modules - List student's enrolled modules
 */
export async function handleListEnrolledModules(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT (via API Gateway authorizer)
    const userId = LambdaUtil.getUserId(event);
    const { page = 1, limit = 10 } = LambdaUtil.getPagination(event);

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    LoggerUtil.info('Fetching student enrolled modules', { userId });

    // Get email from JWT claims
    const email = LambdaUtil.getQueryParam(event, 'email') || event.requestContext?.authorizer?.claims?.email;
    
    // Query student by userId first
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    // If not found by userId and email is available, try email lookup (fallback for userId mismatches)
    if ((!items || items.length === 0) && email) {
      LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
      const emailResult = await DynamoDBService.query(
        tables.STUDENTS,
        'email = :email',
        { ':email': email },
        { indexName: 'email-index' }
      );
      items = emailResult.items;
    }

    if (!items || items.length === 0) {
      LoggerUtil.warn('Student not found', { userId, email });
      throw new NotFoundError('Student not found');
    }

    const student = items[0];
    LoggerUtil.info('Student found', { userId, studentId: student.studentId, email: student.email });

    // Get enrolled module details
    const moduleIds = student.moduleIds || [];
    if (moduleIds.length === 0) {
      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success([])
      );
    }

    const modules = await DynamoDBService.batchGet(
      tables.MODULES,
      moduleIds.map((id) => ({ moduleId: id }))
    );

    const offset = (page - 1) * limit;
    const paginatedModules = modules.slice(offset, offset + limit);
    
    // Enrich modules with department info and thumbnails
    const enrichedModules = await Promise.all(
      paginatedModules.map(m => enrichModuleData(m))
    );

    LoggerUtil.info('Student enrolled modules retrieved', {
      userId,
      totalModules: modules.length,
      returnedModules: enrichedModules.length,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(enrichedModules)
    );
  });
}

/**
 * GET /student/modules/{moduleId} - Get module details (if enrolled)
 */
export async function handleGetModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const studentId = LambdaUtil.getPathParam(event, 'studentId');
    const moduleId = LambdaUtil.getPathParam(event, 'moduleId');

    if (!studentId || !moduleId) {
      throw new BadRequestError('Student ID and Module ID are required');
    }

    // Verify enrollment
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    if (!student.moduleIds || !student.moduleIds.includes(moduleId)) {
      throw new ForbiddenError('You are not enrolled in this module');
    }

    // Get module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(module));
  });
}

/**
 * POST /student/modules/{moduleId}/enroll - Enroll in a module
 */
export async function handleEnroll(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const studentId = LambdaUtil.getPathParam(event, 'studentId');
    const moduleId = LambdaUtil.getPathParam(event, 'moduleId');

    if (!studentId || !moduleId) {
      throw new BadRequestError('Student ID and Module ID are required');
    }

    // Get student
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Check if already enrolled
    if (student.moduleIds && student.moduleIds.includes(moduleId)) {
      throw new BadRequestError('Already enrolled in this module');
    }

    // Get module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    // Update student enrollment
    const moduleIds = student.moduleIds || [];
    moduleIds.push(moduleId);
    const now = Date.now();

    await DynamoDBService.update(
      tables.STUDENTS,
      { studentId },
      { moduleIds, updatedAt: now }
    );

    // Update module enrollment count
    const studentCount = (module.studentCount || 0) + 1;
    await DynamoDBService.update(
      tables.MODULES,
      { moduleId },
      { studentCount, updatedAt: now }
    );

    LoggerUtil.info('Student enrolled in module', { studentId, moduleId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({}, 'Enrolled successfully')
    );
  });
}

/**
 * GET /student/modules/{moduleId}/files - List module files
 */
export async function handleListModuleFiles(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const studentId = LambdaUtil.getPathParam(event, 'studentId');
    const moduleId = LambdaUtil.getPathParam(event, 'moduleId');
    const { page, limit } = LambdaUtil.getPagination(event);

    if (!studentId || !moduleId) {
      throw new BadRequestError('Student ID and Module ID are required');
    }

    // Verify enrollment
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    if (!student || !student.moduleIds || !student.moduleIds.includes(moduleId)) {
      throw new ForbiddenError('You are not enrolled in this module');
    }

    // Get files
    const { items, count } = await DynamoDBService.query(
      tables.FILES,
      'moduleId = :moduleId',
      { ':moduleId': moduleId },
      { indexName: 'moduleId+uploadedAt-index', limit }
    );

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(items, page, limit, count || items.length)
    );
  });
}

/**
 * GET /student/modules/{moduleId}/quizzes - List module quizzes
 */
export async function handleListModuleQuizzes(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const studentId = LambdaUtil.getPathParam(event, 'studentId');
    const moduleId = LambdaUtil.getPathParam(event, 'moduleId');
    const { page, limit } = LambdaUtil.getPagination(event);

    if (!studentId || !moduleId) {
      throw new BadRequestError('Student ID and Module ID are required');
    }

    // Verify enrollment
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    if (!student || !student.enrolledModules || !student.enrolledModules.includes(moduleId)) {
      throw new ForbiddenError('You are not enrolled in this module');
    }

    // Get quizzes
    const { items, count } = await DynamoDBService.query(
      tables.QUIZZES,
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
