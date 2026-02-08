import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-2';
const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

async function checkData() {
  try {
    console.log('\n=== Checking DynamoDB Data ===\n');
    
    const tables = ['aitutor_departments', 'aitutor_faculties', 'aitutor_campuses'];
    
    for (const table of tables) {
      const command = new ScanCommand({
        TableName: table,
        Limit: 10,
      });
      
      const response = await client.send(command);
      console.log(`\n📋 ${table}: ${response.Count} items`);
      
      if (response.Items && response.Items.length > 0) {
        console.log('First item keys:', Object.keys(response.Items[0]));
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkData();
