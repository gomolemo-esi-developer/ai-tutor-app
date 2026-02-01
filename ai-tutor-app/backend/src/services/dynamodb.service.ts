import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { AwsConfig } from '../config/aws.config';
import { DatabaseConfig } from '../config/database.config';
import { LoggerUtil } from '../utils/logger.util';
import { InternalServerError } from '../utils/error.util';

/**
 * DynamoDB wrapper service - handles all database operations
 * Note: AWS services are initialized in AwsConfig, not duplicated here
 */
export class DynamoDBService {
  private static client = AwsConfig.getDynamoDbClient();

  /**
   * Get a single item
   */
  static async get(tableName: string, key: Record<string, any>): Promise<any> {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key,
      });

      const response = await this.client.send(command);
      return response.Item || null;
    } catch (error) {
      LoggerUtil.error(`Failed to get item from ${tableName}`, error as Error);
      throw new InternalServerError('Database operation failed');
    }
  }

  /**
   * Put/create a new item
   */
  static async put(tableName: string, item: Record<string, any>): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item,
      });

      await this.client.send(command);
      LoggerUtil.debug(`Item put into ${tableName}`, { itemId: item.id || item.studentId || item.lecturerId });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      LoggerUtil.error(`Failed to put item into ${tableName}: ${errorMsg}`, error as Error);
      LoggerUtil.error(`Item being saved:`, item);
      throw new InternalServerError(`Database operation failed: ${errorMsg}`);
    }
  }

  /**
   * Update an item (partial update)
   */
  static async update(
    tableName: string,
    key: Record<string, any>,
    updates: Record<string, any>
  ): Promise<any> {
    try {
      const updateExpression = this.buildUpdateExpression(updates);

      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression.expression,
        ExpressionAttributeNames: updateExpression.names,
        ExpressionAttributeValues: updateExpression.values,
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.client.send(command);
      LoggerUtil.debug(`Item updated in ${tableName}`, { itemId: key });
      return response.Attributes;
    } catch (error) {
      LoggerUtil.error(`Failed to update item in ${tableName}`, error as Error);
      throw new InternalServerError('Database operation failed');
    }
  }

  /**
   * Delete an item
   */
  static async delete(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key,
      });

      await this.client.send(command);
      LoggerUtil.debug(`Item deleted from ${tableName}`, { itemId: key });
    } catch (error) {
      LoggerUtil.error(`Failed to delete item from ${tableName}`, error as Error);
      throw new InternalServerError('Database operation failed');
    }
  }

  /**
   * Query items using GSI
   */
  static async query(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: {
      indexName?: string;
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
      expressionAttributeNames?: Record<string, string>;
      scanIndexForward?: boolean;
    }
  ): Promise<{ items: any[]; count: number; lastEvaluatedKey?: Record<string, any> }> {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        IndexName: options?.indexName,
        Limit: options?.limit,
        ExclusiveStartKey: options?.exclusiveStartKey,
        ExpressionAttributeNames: options?.expressionAttributeNames,
        ScanIndexForward: options?.scanIndexForward,
      });

      const response = await this.client.send(command);

      return {
        items: response.Items || [],
        count: response.Count || 0,
        lastEvaluatedKey: response.LastEvaluatedKey,
      };
    } catch (error) {
      LoggerUtil.error(`Query failed on ${tableName}`, error as Error);
      throw new InternalServerError('Database query failed');
    }
  }

  /**
   * Scan table (use sparingly)
   */
  static async scan(
    tableName: string,
    options?: {
      filterExpression?: string;
      expressionAttributeValues?: Record<string, any>;
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
    }
  ): Promise<{ items: any[]; count: number; lastEvaluatedKey?: Record<string, any> }> {
    try {
      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: options?.filterExpression,
        ExpressionAttributeValues: options?.expressionAttributeValues,
        Limit: options?.limit,
        ExclusiveStartKey: options?.exclusiveStartKey,
      });

      const response = await this.client.send(command);

      return {
        items: response.Items || [],
        count: response.Count || 0,
        lastEvaluatedKey: response.LastEvaluatedKey,
      };
    } catch (error) {
      LoggerUtil.error(`Scan failed on ${tableName}`, error as Error);
      throw new InternalServerError('Database scan failed');
    }
  }

  /**
   * Batch get multiple items
   */
  static async batchGet(
    tableName: string,
    keys: Record<string, any>[]
  ): Promise<any[]> {
    try {
      const command = new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      });

      const response = await this.client.send(command);
      return response.Responses?.[tableName] || [];
    } catch (error) {
      LoggerUtil.error(`Batch get failed on ${tableName}`, error as Error);
      throw new InternalServerError('Batch operation failed');
    }
  }

  /**
   * Batch write items (create/update/delete)
   */
  static async batchWrite(
    tableName: string,
    items: Array<{ action: 'put' | 'delete'; item: Record<string, any> }>
  ): Promise<void> {
    try {
      const requestItems = items.map((item) => {
        if (item.action === 'put') {
          return { PutRequest: { Item: item.item } };
        } else {
          return { DeleteRequest: { Key: item.item } };
        }
      });

      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: requestItems,
        },
      });

      await this.client.send(command);
      LoggerUtil.debug(`Batch write completed on ${tableName}`, { itemCount: items.length });
    } catch (error) {
      LoggerUtil.error(`Batch write failed on ${tableName}`, error as Error);
      throw new InternalServerError('Batch operation failed');
    }
  }

  /**
   * Build UpdateExpression from updates object
   */
  private static buildUpdateExpression(updates: Record<string, any>) {
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};
    const setParts: string[] = [];
    let counter = 0;

    Object.entries(updates).forEach(([key, value]) => {
      const nameKey = `#attr${counter}`;
      const valueKey = `:val${counter}`;

      names[nameKey] = key;
      values[valueKey] = value;
      setParts.push(`${nameKey} = ${valueKey}`);

      counter++;
    });

    return {
      expression: `SET ${setParts.join(', ')}`,
      names,
      values,
    };
  }
}
