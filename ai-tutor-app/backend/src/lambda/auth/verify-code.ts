/**
 * POST /api/auth/verify-email - Verify email using 6-digit code
 * User provides email and verification code from email
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { DatabaseConfig } from '../../config/database.config';
import { DynamoDBService } from '../../services/dynamodb.service';
import { VerificationService } from '../../services/verification.service';
import { BadRequestError, NotFoundError } from '../../utils/error.util';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function handleVerifyEmailCode(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);

    // Validate input
    const input = verifyCodeSchema.parse(body);

    try {
      // Verify the code
      await VerificationService.verifyCode(input.email, input.code);

      // Mark user as activated in DynamoDB
      const tables = DatabaseConfig.getTables();
      const user = await DynamoDBService.query(
        tables.USERS,
        'email = :email',
        { ':email': input.email },
        { indexName: 'email-index' }
      );

      if (!user.items || user.items.length === 0) {
        throw new NotFoundError('User not found');
      }

      const userData = user.items[0];
      const now = Date.now();
      
      await DynamoDBService.update(
        tables.USERS,
        { userId: userData.userId },
        {
          isActivated: true,
          updatedAt: now,
        }
      );

      // Update Lecturer/Student record if exists
      if (userData.role === 'EDUCATOR') {
        try {
          const lecturers = await DynamoDBService.query(
            tables.LECTURERS,
            'userId = :userId',
            { ':userId': userData.userId },
            { indexName: 'userId-index' }
          );
          if (lecturers.items && lecturers.items.length > 0) {
            await DynamoDBService.update(
              tables.LECTURERS,
              { lecturerId: lecturers.items[0].lecturerId },
              {
                registrationStatus: 'ACTIVATED',
                activatedAt: now,
                updatedAt: now,
              }
            );
            LoggerUtil.info('Educator registration activated', { 
              userId: userData.userId,
              lecturerId: lecturers.items[0].lecturerId 
            });
          }
        } catch (lecturerError) {
          LoggerUtil.warn('Failed to update educator record', { 
            userId: userData.userId,
            error: lecturerError 
          });
        }
      } else if (userData.role === 'STUDENT') {
        try {
          const students = await DynamoDBService.query(
            tables.STUDENTS,
            'userId = :userId',
            { ':userId': userData.userId },
            { indexName: 'userId-index' }
          );
          if (students.items && students.items.length > 0) {
            await DynamoDBService.update(
              tables.STUDENTS,
              { studentId: students.items[0].studentId },
              {
                registrationStatus: 'ACTIVATED',
                activatedAt: now,
                updatedAt: now,
              }
            );
            LoggerUtil.info('Student registration activated', { 
              userId: userData.userId,
              studentId: students.items[0].studentId 
            });
          }
        } catch (studentError) {
          LoggerUtil.warn('Failed to update student record', { 
            userId: userData.userId,
            error: studentError 
          });
        }
      }

      LoggerUtil.info('Email verified and account activated', { email: input.email });

      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success(
          { email: input.email },
          'Email verified and account activated'
        )
      );
    } catch (error: any) {
      LoggerUtil.error('Email verification failed', { 
        email: input.email, 
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStack: error?.stack
      });
      throw error;
    }
  });
}
