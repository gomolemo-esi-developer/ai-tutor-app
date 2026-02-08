/**
 * Script to clear all chat sessions and messages from DynamoDB
 * NO CONFIRMATION - Use with caution!
 * 
 * Usage: npx ts-node scripts/clear-all-chats-no-confirm.ts
 */

import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;

const CHAT_SESSIONS_TABLE = 'aitutor_chat_sessions';
const CHAT_MESSAGES_TABLE = 'aitutor_chat_messages';

// Initialize DynamoDB client
const dynamoDbClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: AWS_REGION,
    endpoint: DYNAMODB_ENDPOINT,
  }),
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  }
);

interface ChatSession {
  sessionId: string;
  studentId: string;
}

interface ChatMessage {
  messageId: string;
  sessionId: string;
}

async function getAllItems<T>(
  tableName: string
): Promise<T[]> {
  const items: T[] = [];
  let lastEvaluatedKey: any = undefined;

  console.log(`\n📥 Scanning ${tableName}...`);

  try {
    while (true) {
      const response = await dynamoDbClient.send(
        new ScanCommand({
          TableName: tableName,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      if (response.Items && response.Items.length > 0) {
        items.push(...(response.Items as T[]));
        console.log(`   Found ${response.Items.length} items`);
      }

      if (!response.LastEvaluatedKey) {
        break;
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    }
  } catch (error) {
    console.error(`   ❌ Error scanning ${tableName}:`, error);
    throw error;
  }

  console.log(`✅ Total items in ${tableName}: ${items.length}`);
  return items;
}

async function deleteItemsInBatches(
  tableName: string,
  items: any[]
): Promise<void> {
  if (items.length === 0) {
    console.log(`⏭️  No items to delete from ${tableName}`);
    return;
  }

  console.log(`\n🗑️  Deleting items from ${tableName}...`);

  let deletedCount = 0;

  try {
    for (const item of items) {
      const key: any = {};

      // Detect all key attributes
      if (tableName === CHAT_SESSIONS_TABLE) {
        key.sessionId = item.sessionId;
      } else if (tableName === CHAT_MESSAGES_TABLE) {
        key.messageId = item.messageId;
      }

      await dynamoDbClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: key,
        })
      );
      deletedCount++;

      if (deletedCount % 10 === 0) {
        console.log(`   Deleted ${deletedCount} items...`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error deleting from ${tableName}:`, error);
    throw error;
  }

  console.log(`✅ Successfully deleted ${deletedCount} items from ${tableName}`);
}

async function main() {
  console.log('🔄 Starting chat cleanup...');
  console.log(`   Region: ${AWS_REGION}`);
  console.log(`   Endpoint: ${DYNAMODB_ENDPOINT || 'AWS default'}`);

  try {
    // Get all chat sessions and messages
    const chatSessions = await getAllItems<ChatSession>(CHAT_SESSIONS_TABLE);
    const chatMessages = await getAllItems<ChatMessage>(CHAT_MESSAGES_TABLE);

    console.log('\n⚠️  DELETING WITHOUT CONFIRMATION');
    console.log(`   Deleting: ${chatSessions.length} chat sessions`);
    console.log(`   Deleting: ${chatMessages.length} chat messages`);

    // Delete items immediately (no confirmation)
    await deleteItemsInBatches(CHAT_MESSAGES_TABLE, chatMessages);
    await deleteItemsInBatches(CHAT_SESSIONS_TABLE, chatSessions);

    console.log(
      '\n✨ Chat cleanup complete! All chats and messages have been deleted.'
    );
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
