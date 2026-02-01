import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import * as dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-2';
const client = new DynamoDBClient({ region });

async function listTables() {
  try {
    const command = new ListTablesCommand({});
    const response = await client.send(command);
    console.log('Tables in', region, ':', response.TableNames);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

listTables();
