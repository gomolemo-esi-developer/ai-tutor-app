import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { createCourseSchema, updateCourseSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/error.util';
import { Course } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Normalize course data - handles both old and new schema formats
 */
function normalizeCourse(course: any): Course {
  return {
    courseId: course.courseId,
    courseName: course.courseName || course.name,
    courseCode: course.courseCode || course.code,
    departmentId: course.departmentId,
    duration: course.duration,
    credits: course.credits,
    description: course.description,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    createdBy: course.createdBy,
  };
}

/**
 * GET /admin/courses - List all courses
 */
export async function handleListCourses(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const { page, limit } = LambdaUtil.getPagination(event);
    const offset = (page - 1) * limit;

    const { items, count } = await DynamoDBService.scan(tables.COURSES, {
      limit: limit + 1,
    });

    const paginatedItems = items.slice(offset, offset + limit).map(normalizeCourse);

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(paginatedItems, page, limit, count)
    );
  });
}

/**
 * POST /admin/courses - Create a new course
 */
export async function handleCreateCourse(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);
    const userId = LambdaUtil.getUserId(event);

    // Validate input
    const input = createCourseSchema.parse(body);

    // Check for duplicate course code
    const existing = await DynamoDBService.scan(tables.COURSES, {
      filterExpression: 'courseCode = :code',
      expressionAttributeValues: {
        ':code': input.courseCode,
      },
    });

    if (existing.count > 0) {
      throw new ConflictError('Course code already exists');
    }

    // Generate course ID using UUID v4
    const courseId = uuidv4();

    // Create course
    const course: Course = {
      courseId,
      courseCode: input.courseCode,
      courseName: input.courseName,
      departmentId: input.departmentId,
      duration: input.duration,
      credits: input.credits,
      description: input.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    };

    await DynamoDBService.put(tables.COURSES, course);

    LoggerUtil.info('Course created', { courseId: course.courseId });

    return ResponseUtil.lambdaResponse(201, ResponseUtil.success(normalizeCourse(course)));
  });
}

/**
 * GET /admin/courses/{id} - Get course by ID
 */
export async function handleGetCourse(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const courseId = LambdaUtil.getPathParam(event, 'id');

    if (!courseId) {
      throw new BadRequestError('Course ID is required');
    }

    const course = await DynamoDBService.get(tables.COURSES, { courseId });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeCourse(course)));
  });
}

/**
 * PUT /admin/courses/{id} - Update course
 */
export async function handleUpdateCourse(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const courseId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!courseId) {
      throw new BadRequestError('Course ID is required');
    }

    // Validate input
    const input = updateCourseSchema.parse(body);

    // Check if course exists
    const existing = await DynamoDBService.get(tables.COURSES, { courseId });

    if (!existing) {
      throw new NotFoundError('Course not found');
    }

    // Check for duplicate course code if code is being updated
    if (input.courseCode && input.courseCode !== existing.courseCode) {
      const duplicate = await DynamoDBService.scan(tables.COURSES, {
        filterExpression: 'courseCode = :code AND courseId <> :id',
        expressionAttributeValues: {
          ':code': input.courseCode,
          ':id': courseId,
        },
      });

      if (duplicate.count > 0) {
        throw new ConflictError('Course code already exists');
      }
    }

    // Prepare update object
    const updates: any = {
      ...input,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const updated = await DynamoDBService.update(tables.COURSES, { courseId }, updates);

    LoggerUtil.info('Course updated', { courseId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeCourse(updated)));
  });
}

/**
 * DELETE /admin/courses/{id} - Delete course
 */
export async function handleDeleteCourse(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const courseId = LambdaUtil.getPathParam(event, 'id');

    if (!courseId) {
      throw new BadRequestError('Course ID is required');
    }

    const existing = await DynamoDBService.get(tables.COURSES, { courseId });

    if (!existing) {
      throw new NotFoundError('Course not found');
    }

    await DynamoDBService.delete(tables.COURSES, { courseId });

    LoggerUtil.info('Course deleted', { courseId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({ message: 'Course deleted successfully' })
    );
  });
}
