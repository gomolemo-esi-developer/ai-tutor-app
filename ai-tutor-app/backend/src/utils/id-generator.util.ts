import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { AwsConfig } from '../config/aws.config';
import { LoggerUtil } from './logger.util';

/**
 * Generates a new entity ID in the format: prefix-001, prefix-002, etc.
 * 
 * @param tableName - DynamoDB table name
 * @param prefix - ID prefix (e.g., 'fac', 'dept', 'course', 'module', 'campus')
 * @param idField - Field name containing the ID (default: 'id' or '{entity}Id')
 * @returns Promise<string> - Generated ID like 'fac-001'
 */
export async function generateEntityId(
  tableName: string,
  prefix: string,
  idField: string = 'id'
): Promise<string> {
  try {
    // Get the DynamoDB client
    const client = AwsConfig.getDynamoDbClient();
    
    // Scan table to get all IDs
    const command = new ScanCommand({
      TableName: tableName,
      ProjectionExpression: idField,
    });

    const response = await (client as any).send(command);
    const items = response.Items || [];

    // Extract numeric suffixes from IDs matching the pattern
    const numbers: number[] = [];
    
    for (const item of items) {
      if (item && item[idField]) {
        const idValue = String(item[idField]);
        // Match pattern like "fac-001", "dept-002", etc.
        const match = idValue.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
          numbers.push(parseInt(match[1], 10));
        }
      }
    }

    // Find the next number
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const newId = `${prefix}-${String(nextNumber).padStart(3, '0')}`;

    LoggerUtil.info(`Generated ID for ${prefix}`, { id: newId });
    return newId;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    LoggerUtil.error(`Error generating ID for ${prefix}`, error as Error);
    throw new Error(`Failed to generate ID for ${prefix}: ${errorMsg}`);
  }
}

/**
 * Batch generate multiple IDs
 */
export async function generateMultipleEntityIds(
  tableName: string,
  prefix: string,
  docClient: DynamoDBDocumentClient,
  count: number = 1,
  idField: string = 'id'
): Promise<string[]> {
  const ids: string[] = [];
  let baseNumber = 0;

  try {
    // Get current max number
    const client = (docClient as any).commandClient as DynamoDBClient;
    const command = new ScanCommand({
      TableName: tableName,
      ProjectionExpression: idField,
    });

    const response = await client.send(command);
    const items = response.Items || [];

    const numbers: number[] = [];
    for (const item of items) {
      if (item[idField] && item[idField].S) {
        const idValue = item[idField].S;
        const match = idValue.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
          numbers.push(parseInt(match[1], 10));
        }
      }
    }

    baseNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

    // Generate requested number of IDs
    for (let i = 1; i <= count; i++) {
      const nextNumber = baseNumber + i;
      ids.push(`${prefix}-${String(nextNumber).padStart(3, '0')}`);
    }

    console.log(`✅ Generated ${count} IDs for ${prefix}:`, ids);
    return ids;
  } catch (error) {
    console.error(`❌ Error generating multiple IDs for ${prefix}:`, error);
    throw new Error(`Failed to generate IDs for ${prefix}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
