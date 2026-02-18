import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { createStudentSchema, updateStudentSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { Student } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * Normalize student data - handles both old and new schema formats
 */
function normalizeStudent(student: any): Student {
  return {
    studentId: student.studentId,
    userId: student.userId,
    studentNumber: student.studentNumber,
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
    title: student.title,
    departmentId: student.departmentId,
    campusId: student.campusId,
    courseId: student.courseId,
    moduleIds: student.moduleIds || [],
    enrollmentYear: student.enrollmentYear,
    registrationStatus: student.registrationStatus,
    phone: student.phone,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    createdBy: student.createdBy,
  };
}

/**
 * GET /admin/students - List all students
 */
export async function handleListStudents(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const { page, limit } = LambdaUtil.getPagination(event);
    const offset = (page - 1) * limit;

    const { items, count } = await DynamoDBService.scan(tables.STUDENTS, {
      limit: limit + 1,
    });

    const paginatedItems = items.slice(offset, offset + limit).map(normalizeStudent);

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(paginatedItems, page, limit, count)
    );
  });
}

/**
 * POST /admin/students - Create a new student
 */
export async function handleCreateStudent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    LoggerUtil.debug('Creating student with body', body);

    // Validate input
    const input = createStudentSchema.parse(body);

    // Create student with correct schema
    const now = Date.now();
    const student: Student = {
      studentId: UuidUtil.generateWithPrefix('student'),
      userId: UuidUtil.generateWithPrefix('user'),
      studentNumber: input.studentNumber,
      email: input.email,
      title: input.title,
      departmentId: input.departmentId,
      campusId: input.campusId,
      moduleIds: input.moduleIds || [],
      enrollmentYear: input.enrollmentYear,
      registrationStatus: 'PENDING',
      phone: input.phone,
      createdAt: now,
      updatedAt: now,
      createdBy: 'admin',
    };

    LoggerUtil.debug('Student object to save', student);

    await DynamoDBService.put(tables.STUDENTS, student);

    LoggerUtil.info('Student created', { studentId: student.studentId, studentNumber: input.studentNumber });

    return ResponseUtil.lambdaResponse(201, ResponseUtil.success(normalizeStudent(student)));
  });
}

/**
 * GET /admin/students/{id} - Get student by ID
 */
export async function handleGetStudent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const studentId = LambdaUtil.getPathParam(event, 'id');

    if (!studentId) {
      throw new BadRequestError('Student ID is required');
    }

    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });

    if (!student) {
      throw new NotFoundError('Student not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeStudent(student)));
  });
}

/**
 * PUT /admin/students/{id} - Update student
 */
export async function handleUpdateStudent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const studentId = LambdaUtil.getPathParam(event, 'id');
    const body = LambdaUtil.parseBody(event);

    if (!studentId) {
      throw new BadRequestError('Student ID is required');
    }

    // Validate input
    const input = updateStudentSchema.parse(body);

    // Update student
    const now = Date.now();
    const updated = await DynamoDBService.update(
      tables.STUDENTS,
      { studentId },
      {
        ...input,
        updatedAt: now,
      }
    );

    LoggerUtil.info('Student updated', { studentId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeStudent(updated)));
  });
}

/**
 * DELETE /admin/students/{id} - Delete student
 */
export async function handleDeleteStudent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const studentId = LambdaUtil.getPathParam(event, 'id');

    if (!studentId) {
      throw new BadRequestError('Student ID is required');
    }

    // Verify student exists
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Delete student
    await DynamoDBService.delete(tables.STUDENTS, { studentId });

    LoggerUtil.info('Student deleted', { studentId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success({}, 'Student deleted'));
  });
}

/**
 * GET /admin/students/user/{userId} - Get student by user ID
 */
export async function handleGetStudentByUserId(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getPathParam(event, 'userId');

    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    if (!items || items.length === 0) {
      throw new NotFoundError('Student not found');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(normalizeStudent(items[0])));
  });
}
