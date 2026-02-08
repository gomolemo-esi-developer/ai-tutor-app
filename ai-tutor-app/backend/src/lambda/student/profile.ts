/**
 * Student Profile Handler
 * GET /api/student/profile - Get student profile (name, number, campus, department, enrollment year)
 *
 * Frontend: /profile route (Personal Information Card + Academic Information Card)
 * Response Format: firstName, lastName, studentNumber, email, campusName, departmentName, enrollmentYear, enrolledModulesCount
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, ForbiddenError } from '../../utils/error.util';

const tables = DatabaseConfig.getTables();

/**
 * GET /api/student/profile - Get student profile
 * Authorization: STUDENT role required
 * Returns: Personal and academic information
 */
export async function handleGetStudentProfile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT (via API Gateway authorizer)
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (role !== 'STUDENT') {
      throw new ForbiddenError('Only students can access this endpoint');
    }

    LoggerUtil.info('Fetching student profile', { userId });

    // Get email from JWT claims
    const email = event.requestContext?.authorizer?.claims?.email;

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
      LoggerUtil.warn('Student profile not found', { userId, email });
      throw new NotFoundError('Student profile not found');
    }

    const student = items[0];

    // Get campus name
    const campus = await DynamoDBService.get(
      tables.CAMPUSES,
      { campusId: student.campusId }
    );
    const campusName = campus?.campusName || 'Unknown';

    // Get department name
    const department = await DynamoDBService.get(
      tables.DEPARTMENTS,
      { departmentId: student.departmentId }
    );
    const departmentName = department?.departmentName || 'Unknown';

    // Get course name if courseId exists
    let courseName = undefined;
    let courseCode = undefined;
    if (student.courseId) {
      try {
        const course = await DynamoDBService.get(
          tables.COURSES,
          { courseId: student.courseId }
        );
        courseName = course?.courseName;
        courseCode = course?.courseCode;
      } catch (err) {
        LoggerUtil.warn('Failed to fetch course', { courseId: student.courseId });
      }
    }

    // Build response with exact field names from schema
    const response = {
      firstName: student.firstName,
      lastName: student.lastName,
      studentNumber: student.studentNumber,
      email: student.email,
      campusName: campusName,
      departmentName: departmentName,
      courseId: student.courseId,
      courseName: courseName,
      courseCode: courseCode,
      enrollmentYear: student.enrollmentYear,
      enrolledModulesCount: student.moduleIds?.length || 0,
    };

    LoggerUtil.info('Student profile retrieved', {
      userId,
      studentNumber: student.studentNumber,
      modulesCount: response.enrolledModulesCount,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(response)
    );
  });
}
