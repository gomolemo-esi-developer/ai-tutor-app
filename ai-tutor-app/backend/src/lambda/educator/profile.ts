/**
 * Educator Profile Handler
 * GET /api/educator/profile - Get educator profile (name, staff number, campus, department, title)
 *
 * Frontend: /profile route (Personal Information Card + Academic Information Card)
 * Response Format: firstName, lastName, staffNumber, email, title, campusName, departmentName, assignedModulesCount
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
 * GET /api/educator/profile - Get educator profile
 * Authorization: EDUCATOR role required
 * Returns: Personal and academic information
 */
export async function handleGetEducatorProfile(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT (via API Gateway authorizer)
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (role !== 'EDUCATOR') {
      throw new ForbiddenError('Only educators can access this endpoint');
    }

    LoggerUtil.info('Fetching educator profile', { userId });

    // Get email from JWT claims
    const email = event.requestContext?.authorizer?.claims?.email;

    // Query educator by userId first
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
      LoggerUtil.warn('Educator profile not found', { userId, email });
      throw new NotFoundError('Educator profile not found');
    }

    const educator = items[0];

    // Get campus name
    const campus = await DynamoDBService.get(
      tables.CAMPUSES,
      { campusId: educator.campusId }
    );
    const campusName = campus?.campusName || 'Unknown';

    // Get department name
    const department = await DynamoDBService.get(
      tables.DEPARTMENTS,
      { departmentId: educator.departmentId }
    );
    const departmentName = department?.departmentName || 'Unknown';

    // Build response with exact field names from schema
    const response = {
      firstName: educator.firstName,
      lastName: educator.lastName,
      staffNumber: educator.staffNumber,
      email: educator.email,
      title: educator.title || undefined, // Optional field
      campusName: campusName,
      departmentName: departmentName,
      assignedModulesCount: educator.moduleIds?.length || 0,
    };

    // Remove undefined title if not present
    if (!response.title) {
      delete response.title;
    }

    LoggerUtil.info('Educator profile retrieved', {
      userId,
      staffNumber: educator.staffNumber,
      modulesCount: response.assignedModulesCount,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(response)
    );
  });
}
