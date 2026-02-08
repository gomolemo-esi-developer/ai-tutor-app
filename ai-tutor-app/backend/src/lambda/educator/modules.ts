import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { createModuleSchema, updateModuleSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { Module } from '../../models/types';

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
 * GET /api/educator/modules - List educator's modules
 */
export async function handleListModules(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT (via API Gateway authorizer)
    const userId = LambdaUtil.getUserId(event);
    const { page = 1, limit = 10 } = LambdaUtil.getPagination(event);

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    LoggerUtil.info('Fetching educator assigned modules', { userId });

    // Get email from JWT claims
    const email = event.requestContext?.authorizer?.claims?.email;

    // Query lecturer by userId first
    let { items } = await DynamoDBService.query(
      tables.LECTURERS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    // If not found by userId and email is available, try email lookup (fallback for userId mismatches)
    if ((!items || items.length === 0) && email) {
      LoggerUtil.info('Educator not found by userId, trying email lookup', { userId, email });
      const emailResult = await DynamoDBService.query(
        tables.LECTURERS,
        'email = :email',
        { ':email': email },
        { indexName: 'email-index' }
      );
      items = emailResult.items;
    }

    if (!items || items.length === 0) {
      LoggerUtil.warn('Educator not found', { userId, email });
      throw new NotFoundError('Educator profile not found');
    }

    const lecturer = items[0];

    const moduleIds = lecturer.moduleIds || [];
    if (moduleIds.length === 0) {
      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success([])
      );
    }

    const modules = await DynamoDBService.batchGet(
      tables.MODULES,
      moduleIds.map(id => ({ moduleId: id }))
    );

    const offset = (page - 1) * limit;
    const paginatedModules = modules.slice(offset, offset + limit);
    
    // Enrich modules with department info and thumbnails
    const enrichedModules = await Promise.all(
      paginatedModules.map(m => enrichModuleData(m))
    );

    LoggerUtil.info('Educator assigned modules retrieved', {
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
 * POST /educator/modules - Create a new module
 */
export async function handleCreateModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const body = LambdaUtil.parseBody(event);

    if (!lecturerId) {
      throw new BadRequestError('Lecturer ID is required');
    }

    // Validate input
    const input = createModuleSchema.parse(body);

    // Create module with correct schema
    const now = Date.now();
    const module: Module = {
      moduleId: UuidUtil.generateModuleId(),
      moduleName: input.moduleName,
      moduleCode: input.moduleCode,
      description: input.description,
      lecturerIds: input.lecturerIds,
      departmentId: input.departmentId,
      status: 'DRAFT',
      studentCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: lecturerId,
    };

    await DynamoDBService.put(tables.MODULES, module);

    LoggerUtil.info('Module created by educator', { moduleId: module.moduleId, lecturerId });

    return ResponseUtil.lambdaResponse(201, ResponseUtil.success(module));
  });
}

/**
 * GET /educator/modules/{id} - Get module
 */
export async function handleGetModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const moduleId = LambdaUtil.getPathParam(event, 'id');

    if (!lecturerId || !moduleId) {
      throw new BadRequestError('Lecturer ID and Module ID are required');
    }

    const module = await DynamoDBService.get(tables.MODULES, { moduleId });

    if (!module) {
      throw new NotFoundError('Module not found');
    }

    // Verify ownership (check if lecturer is in the lecturerIds array)
    if (!module.lecturerIds.includes(lecturerId)) {
      throw new ForbiddenError('You cannot access this module');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(module));
  });
}

/**
 * PUT /educator/modules/{id} - Update module
 */
export async function handleUpdateModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const moduleId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!lecturerId || !moduleId) {
      throw new BadRequestError('Lecturer ID and Module ID are required');
    }

    // Get existing module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    // Verify ownership (check if lecturer is in the lecturerIds array)
    if (!module.lecturerIds.includes(lecturerId)) {
      throw new ForbiddenError('You cannot update this module');
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

    LoggerUtil.info('Module updated by educator', { moduleId, lecturerId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(updated));
  });
}

/**
 * DELETE /educator/modules/{id} - Delete module
 */
export async function handleDeleteModule(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const moduleId = LambdaUtil.getPathParam(event, 'id');

    if (!lecturerId || !moduleId) {
      throw new BadRequestError('Lecturer ID and Module ID are required');
    }

    // Get existing module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    // Verify ownership
    if (module.lecturerId !== lecturerId) {
      throw new ForbiddenError('You cannot delete this module');
    }

    // Delete module
    await DynamoDBService.delete(tables.MODULES, { moduleId });

    LoggerUtil.info('Module deleted by educator', { moduleId, lecturerId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success({}, 'Module deleted'));
  });
}

/**
 * POST /educator/modules/{id}/content - Update module content
 */
export async function handleUpdateContent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const lecturerId = LambdaUtil.getPathParam(event, 'lecturerId');
    const moduleId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!lecturerId || !moduleId) {
      throw new BadRequestError('Lecturer ID and Module ID are required');
    }

    // Get existing module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    // Verify ownership
    if (module.lecturerId !== lecturerId) {
      throw new ForbiddenError('You cannot update this module');
    }

    // Update content
    const updated = await DynamoDBService.update(
      tables.MODULES,
      { moduleId },
      {
        content: body.content,
        updatedAt: new Date().toISOString(),
      }
    );

    LoggerUtil.info('Module content updated', { moduleId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(updated));
  });
}
