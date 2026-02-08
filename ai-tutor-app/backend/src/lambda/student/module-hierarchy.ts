import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, ForbiddenError } from '../../utils/error.util';

const tables = DatabaseConfig.getTables();

export interface ModuleHierarchy {
  module: {
    moduleId: string;
    moduleCode: string;
    moduleName: string;
    description?: string;
  };
  course: {
    courseId: string;
    courseCode: string;
    courseName: string;
  } | null;
  department: {
    departmentId: string;
    departmentCode: string;
    departmentName: string;
  } | null;
  faculty: {
    facultyId: string;
    facultyCode: string;
    facultyName: string;
  } | null;
}

/**
 * GET /api/student/modules/{moduleId}/hierarchy
 * Returns complete hierarchy: Module → Course → Department → Faculty
 */
export async function handleGetModuleHierarchy(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    const moduleId = LambdaUtil.getPathParam(event, 'moduleId');

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (!moduleId) {
      throw new NotFoundError('Module ID is required');
    }

    LoggerUtil.info('Fetching module hierarchy', { userId, moduleId });

    // Get module
    const module = await DynamoDBService.get(tables.MODULES, { moduleId });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    const hierarchy: ModuleHierarchy = {
      module: {
        moduleId: module.moduleId,
        moduleCode: module.moduleCode,
        moduleName: module.moduleName,
        description: module.description,
      },
      course: null,
      department: null,
      faculty: null,
    };

    // Get course
    if (module.courseId) {
      try {
        const course = await DynamoDBService.get(tables.COURSES, { courseId: module.courseId });
        if (course) {
          hierarchy.course = {
            courseId: course.courseId,
            courseCode: course.courseCode,
            courseName: course.courseName,
          };

          // Get department
          if (course.departmentId) {
            try {
              const department = await DynamoDBService.get(tables.DEPARTMENTS, { departmentId: course.departmentId });
              if (department) {
                hierarchy.department = {
                  departmentId: department.departmentId,
                  departmentCode: department.departmentCode,
                  departmentName: department.departmentName,
                };

                // Get faculty
                if (department.facultyId) {
                  try {
                    const faculty = await DynamoDBService.get(tables.FACULTIES, { facultyId: department.facultyId });
                    if (faculty) {
                      hierarchy.faculty = {
                        facultyId: faculty.facultyId,
                        facultyCode: faculty.facultyCode,
                        facultyName: faculty.facultyName,
                      };
                    }
                  } catch (err) {
                    LoggerUtil.warn('Failed to fetch faculty', { departmentId: course.departmentId, error: err });
                  }
                }
              }
            } catch (err) {
              LoggerUtil.warn('Failed to fetch department', { courseId: module.courseId, error: err });
            }
          }
        }
      } catch (err) {
        LoggerUtil.warn('Failed to fetch course', { moduleId, courseId: module.courseId, error: err });
      }
    }

    // Alternative: If courseId is missing, try to get department directly from module
    if (!hierarchy.department && module.departmentId) {
      try {
        const department = await DynamoDBService.get(tables.DEPARTMENTS, { departmentId: module.departmentId });
        if (department) {
          hierarchy.department = {
            departmentId: department.departmentId,
            departmentCode: department.departmentCode,
            departmentName: department.departmentName,
          };

          if (department.facultyId) {
            try {
              const faculty = await DynamoDBService.get(tables.FACULTIES, { facultyId: department.facultyId });
              if (faculty) {
                hierarchy.faculty = {
                  facultyId: faculty.facultyId,
                  facultyCode: faculty.facultyCode,
                  facultyName: faculty.facultyName,
                };
              }
            } catch (err) {
              LoggerUtil.warn('Failed to fetch faculty', { departmentId: module.departmentId, error: err });
            }
          }
        }
      } catch (err) {
        LoggerUtil.warn('Failed to fetch department from module', { moduleId, error: err });
      }
    }

    LoggerUtil.info('Module hierarchy retrieved', { moduleId, hasHierarchy: !!hierarchy.course });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(hierarchy));
  });
}
