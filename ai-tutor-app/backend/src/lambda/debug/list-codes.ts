/**
 * DEBUG: Check verification code for email
 * GET /api/debug/verification-codes?email=xxx@xxx.com
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { DatabaseConfig } from '../../config/database.config';
import { DynamoDBService } from '../../services/dynamodb.service';

export async function handleListCodes(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    try {
      const email = event.queryStringParameters?.email;
      
      if (!email) {
        return ResponseUtil.lambdaResponse(
          400,
          ResponseUtil.error('BAD_REQUEST', 'Missing email query parameter', 400)
        );
      }

      const tables = DatabaseConfig.getTables();
      const table = tables.VERIFICATION_CODES;

      console.log(`[DEBUG] Looking for codes for email: ${email}`);

      // Query for codes with this email using the email-index
      const result = await DynamoDBService.query(
        table,
        'email = :email',
        { ':email': email },
        { indexName: 'email-index' }
      );

      const codes = (result.items || []).map((item: any) => ({
        pk: item.pk,
        email: item.email,
        type: item.type,
        code: item.code ? '***REDACTED***' : undefined,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString() : undefined,
        attempts: item.attempts,
      }));

      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success(
          { codes, count: codes.length, email, tableName: table },
          'Verification code check complete'
        )
      );
    } catch (error: any) {
      console.error('Error checking codes:', error);
      return ResponseUtil.lambdaResponse(
        500,
        ResponseUtil.error('INTERNAL_ERROR', `Failed to check codes: ${error.message}`, 500)
      );
    }
  });
}
