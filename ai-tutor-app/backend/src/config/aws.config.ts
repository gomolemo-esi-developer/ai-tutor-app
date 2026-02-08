import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { EnvConfig } from './environment';

/**
 * AWS SDK clients - singleton instances
 */
let dynamoDbClient: DynamoDBDocumentClient | null = null;
let s3Client: S3Client | null = null;
let cognitoClient: CognitoIdentityProviderClient | null = null;

export class AwsConfig {
  /**
   * Get DynamoDB client
   */
  static getDynamoDbClient(): DynamoDBDocumentClient {
    if (!dynamoDbClient) {
      const config = EnvConfig.getConfig();
      const client = new DynamoDBClient({
        region: config.AWS_REGION,
        endpoint: config.DYNAMODB_ENDPOINT,
      });

      dynamoDbClient = DynamoDBDocumentClient.from(client, {
        marshallOptions: {
          removeUndefinedValues: true,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });
    }

    return dynamoDbClient;
  }

  /**
   * Get S3 client
   */
  static getS3Client(): S3Client {
    if (!s3Client) {
      const config = EnvConfig.getConfig();
      s3Client = new S3Client({
        region: config.AWS_REGION,
      });
    }

    return s3Client;
  }

  /**
   * Get Cognito client
   */
  static getCognitoClient(): CognitoIdentityProviderClient {
    if (!cognitoClient) {
      const config = EnvConfig.getConfig();
      console.log('[AWS_CONFIG] Initializing Cognito client with region:', config.COGNITO_REGION);
      console.log('[AWS_CONFIG] AWS_ACCESS_KEY_ID available:', !!process.env.AWS_ACCESS_KEY_ID);
      console.log('[AWS_CONFIG] AWS_SECRET_ACCESS_KEY available:', !!process.env.AWS_SECRET_ACCESS_KEY);
      
      cognitoClient = new CognitoIdentityProviderClient({
        region: config.COGNITO_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }

    return cognitoClient;
  }

  /**
   * Close all connections (for cleanup)
   */
  static async closeConnections() {
    if (dynamoDbClient) {
      await dynamoDbClient.send(new (require('@aws-sdk/client-dynamodb').DescribeTableCommand)({
        TableName: 'dummy',
      })).catch(() => {});
    }

    if (s3Client) {
      s3Client.destroy();
    }

    if (cognitoClient) {
      cognitoClient.destroy();
    }
  }
}
