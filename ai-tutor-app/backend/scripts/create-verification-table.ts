import dotenv from 'dotenv';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

dotenv.config();

const DYNAMODB_REGION = process.env.AWS_REGION || 'us-east-2';
const TABLE_NAME = 'aitutor_verification_codes';

async function createVerificationTable() {
  console.log('📋 Creating verification codes table...\n');

  try {
    const dynamoClient = new DynamoDBClient({ region: DYNAMODB_REGION });

    const command = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' }, // Partition key
        { AttributeName: 'sk', KeyType: 'RANGE' }, // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' }, // String
        { AttributeName: 'sk', AttributeType: 'S' }, // String
        { AttributeName: 'expiresAt', AttributeType: 'N' }, // Number for TTL
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
      TimeToLiveSpecification: {
        AttributeName: 'expiresAt',
        Enabled: true,
      },
    });

    const response = await dynamoClient.send(command);
    console.log('✅ Table created successfully!');
    console.log(`Table ARN: ${response.TableDescription?.TableArn}`);
    console.log(`Table Status: ${response.TableDescription?.TableStatus}`);
    console.log(`\nTable: ${TABLE_NAME}`);
    console.log('Partition Key: pk');
    console.log('Sort Key: sk');
    console.log('TTL: expiresAt (auto-delete expired codes after 15 min)\n');
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log('✅ Table already exists!');
    } else {
      console.error('❌ Error creating table:', error.message);
      process.exit(1);
    }
  }
}

createVerificationTable();
