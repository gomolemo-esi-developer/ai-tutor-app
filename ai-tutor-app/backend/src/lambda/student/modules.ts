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
 * Generate unique image URL based on module code - large pool of diverse images
 */
function getModuleImageUrl(moduleName: string, moduleCode: string): string {
  const allImages = [
    'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=400&h=200&fit=crop&q=80', // Physics
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400&h=200&fit=crop&q=80', // Chemistry
    'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=400&h=200&fit=crop&q=80', // Biology
    'https://images.unsplash.com/photo-1509228627152-72ae8fbb8c40?w=400&h=200&fit=crop&q=80', // Math
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop&q=80', // Computer
    'https://images.unsplash.com/photo-1581092161562-40038f04f3e4?w=400&h=200&fit=crop&q=80', // Engineering
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=200&fit=crop&q=80', // Electrical
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=200&fit=crop&q=80', // Business
    'https://images.unsplash.com/photo-1507842217343-583f20270319?w=400&h=200&fit=crop&q=80', // Language
    'https://images.unsplash.com/photo-1507526428915-335fca3ce4e5?w=400&h=200&fit=crop&q=80', // History
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=400&h=200&fit=crop&q=80', // Geography
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&q=80', // Psychology
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop&q=80', // Art
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop&q=80', // Music
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=200&fit=crop&q=80', // Education
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=200&fit=crop&q=80', // Library
    'https://images.unsplash.com/photo-1516321318423-f06f70c504f9?w=400&h=200&fit=crop&q=80', // Tech
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&q=80', // Research
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop&q=80', // Team
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=200&fit=crop&q=80', // Statistics
    'https://images.unsplash.com/photo-1552581234-26160dd20cb7?w=400&h=200&fit=crop&q=80', // Startup
    'https://images.unsplash.com/photo-1516321318423-f06f70c504f9?w=400&h=200&fit=crop&q=80', // Innovation
    'https://images.unsplash.com/photo-1518932945647-7a1c969f8be2?w=400&h=200&fit=crop&q=80', // Design
    'https://images.unsplash.com/photo-1552581234-26160dd20cb7?w=400&h=200&fit=crop&q=80', // Creative
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&q=80', // Professional
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&q=80', // Academic
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=200&fit=crop&q=80', // Learning
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop&q=80', // Development
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=200&fit=crop&q=80', // Analysis
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop&q=80', // Creative
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=200&fit=crop&q=80', // Finance
    'https://images.unsplash.com/photo-1552673673-cc2c63ce702b?w=400&h=200&fit=crop&q=80', // Database
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop&q=80', // Network
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop&q=80', // Systems
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&q=80', // Laboratory
    'https://images.unsplash.com/photo-1516321318423-f06f70c504f9?w=400&h=200&fit=crop&q=80', // Cybersecurity
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=200&fit=crop&q=80', // Analytics
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop&q=80', // Cloud
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop&q=80', // Testing
    'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=200&fit=crop&q=80', // Certification
  ];
  
  // Create hash from moduleCode (more reliable than moduleName)
  const code = moduleCode || moduleName || 'default';
  let hash = 0;
  
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % allImages.length;
  return allImages[index];
}

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
    // Add unique thumbnail based on module name
    thumbnail: module.thumbnail || getModuleImageUrl(module.moduleName || '', module.moduleCode || '')
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
