import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AuthService } from '../../services/auth.service';
import { ValidationService } from '../../services/validation.service';
import { registerSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/error.util';
import { DatabaseConfig } from '../../config/database.config';
import { DynamoDBService } from '../../services/dynamodb.service';

/**
 * POST /auth/register-activation - Register with pre-created record activation
 *
 * Flow:
 * 1. User provides staffNumber (educators) or studentNumber (students)
 * 2. System looks up pre-created Lecturer/Student record
 * 3. If record found and not linked to a user, creates User account
 * 4. Links User to pre-created record, setting registrationStatus to ACTIVATED
 * 5. Returns user info + linked record
 *
 * Request:
 * {
 *   "email": "john@university.edu",
 *   "password": "SecurePass123!",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "role": "EDUCATOR",
 *   "staffNumber": "E001"  // Required for EDUCATOR
 * }
 */
export async function handleRegisterActivation(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    // Validate base input
    const input = registerSchema.parse(body);

    // Validate activation requirements
    if (input.role === 'EDUCATOR' && !input.staffNumber) {
      throw new BadRequestError('staffNumber is required for educators');
    }

    if (input.role === 'STUDENT' && !input.studentNumber) {
      throw new BadRequestError('studentNumber is required for students');
    }

    if (input.role === 'ADMIN') {
      throw new BadRequestError('Admin accounts cannot be created through activation flow');
    }

    // Register user with activation
    const staffOrStudentNumber = input.staffNumber || input.studentNumber!;

    const result = await AuthService.registerUserWithActivation(
      input.email,
      input.password,
      input.firstName,
      input.lastName,
      input.role,
      staffOrStudentNumber,
      input.departmentId
    );

    LoggerUtil.info('User registered with activation', {
      userId: result.user.userId,
      role: input.role,
      staffOrStudentNumber,
      message: 'Cognito verification email sent automatically',
    });

    return ResponseUtil.lambdaResponse(
      201,
      ResponseUtil.success(
        {
          user: {
            userId: result.user.userId,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            isActivated: result.user.isActivated,
          },
          linkedRecord: result.linkedRecord,
        },
        'Account created. Please check your email to verify your account.'
      )
    );
  });
}

/**
 * Verify staff/student number exists and is available for activation
 *
 * Request:
 * {
 *   "role": "EDUCATOR",
 *   "staffNumber": "E001"
 * }
 *
 * Response:
 * {
 *   "available": true,
 *   "record": { lecturer data }
 * }
 */
export async function handleVerifyActivation(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    // Validate required fields
    if (!body.role || (body.role !== 'EDUCATOR' && body.role !== 'STUDENT')) {
      throw new BadRequestError('role must be EDUCATOR or STUDENT');
    }

    if (!body.staffNumber && !body.studentNumber) {
      throw new BadRequestError('staffNumber or studentNumber is required');
    }

    const staffOrStudentNumber = body.staffNumber || body.studentNumber;

    // Verify eligibility
    const result = await ValidationService.verifyActivationEligibility(
      body.role,
      staffOrStudentNumber
    );

    if (!result.eligible) {
      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success({
          available: false,
          error: result.error,
        })
      );
    }

    // Return sanitized record data
    const recordData = result.record as any;
    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        available: true,
        record: {
          ...(body.role === 'EDUCATOR'
            ? {
                lecturerId: recordData.lecturerId,
                staffNumber: recordData.staffNumber,
                email: recordData.email,
                firstName: recordData.firstName,
                lastName: recordData.lastName,
                departmentId: recordData.departmentId,
                campusId: recordData.campusId,
              }
            : {
                studentId: recordData.studentId,
                studentNumber: recordData.studentNumber,
                email: recordData.email,
                firstName: recordData.firstName,
                lastName: recordData.lastName,
                departmentId: recordData.departmentId,
                campusId: recordData.campusId,
              }),
        },
      })
    );
  });
}

/**
 * Check if user can still activate (no collision with existing account)
 *
 * Used by frontend after retrieving activation record to confirm still available
 */
export async function handleCheckActivationStatus(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const recordId = LambdaUtil.getPathParam(event, 'recordId');
    const recordType = LambdaUtil.getQueryParam(event, 'type'); // 'lecturer' or 'student'

    if (!recordId || !recordType) {
      throw new BadRequestError('recordId and type query parameter are required');
    }

    if (recordType !== 'lecturer' && recordType !== 'student') {
      throw new BadRequestError('type must be lecturer or student');
    }

    // Get record from database
    const tables = DatabaseConfig.getTables();
    const tableName = recordType === 'lecturer' ? tables.LECTURERS : tables.STUDENTS;
    const key = recordType === 'lecturer' ? { lecturerId: recordId } : { studentId: recordId };

    const record = await DynamoDBService.get(tableName, key);

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        canActivate: record.registrationStatus === 'PENDING',
        recordStatus: record.registrationStatus || 'PENDING',
        message: record.registrationStatus !== 'PENDING'
          ? 'This record has already been activated'
          : 'This record is available for activation',
      })
    );
  });
}
