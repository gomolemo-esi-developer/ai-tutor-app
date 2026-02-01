import dotenv from 'dotenv';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

dotenv.config();

const DYNAMODB_REGION = process.env.AWS_REGION || 'us-east-2';
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'aitutor_users';

async function addUserToDynamoDB() {
  console.log('📝 Adding user to DynamoDB...\n');

  try {
    const dynamoClient = new DynamoDBClient({ region: DYNAMODB_REGION });

    const timestamp = Date.now();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const userRecord = {
      userId,
      email: 'admin@university.edu',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActivated: true,
      registrationStatus: 'ACTIVATED',
      cognitoId: 'eacb2f64-9b80-4899-b59d-21ba1458f127', // From seed script output
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: 'system',
    };

    const putCommand = new PutItemCommand({
      TableName: USERS_TABLE,
      Item: marshall(userRecord),
    });

    await dynamoClient.send(putCommand);
    console.log('✅ User added to DynamoDB successfully!');
    console.log(`Email: ${userRecord.email}`);
    console.log(`Role: ${userRecord.role}`);
    console.log(`User ID: ${userId}`);
  } catch (error) {
    console.error('❌ Error adding user to DynamoDB:', error);
    process.exit(1);
  }
}

addUserToDynamoDB();
