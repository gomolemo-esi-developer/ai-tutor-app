/**
 * Migration Script: Add titles to all Lecturer records
 * Adds Mr, Ms, Dr, Prof, Mrs titles to lecturers without them
 * 
 * Usage: npx ts-node scripts/migrate-lecturer-titles.ts
 */

import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { AwsConfig } from '../src/config/aws.config';
import dotenv from 'dotenv';

dotenv.config();

const docClient = AwsConfig.getDynamoDbClient();
const LECTURERS_TABLE = process.env.DYNAMODB_LECTURERS_TABLE || 'aitutor_lecturers';

// Default titles rotation (you can customize this mapping)
const DEFAULT_TITLES = ['Mr', 'Ms', 'Mrs', 'Miss', 'Dr'];

interface LecturerRecord {
  lecturerId: string;
  firstName: string;
  lastName: string;
  title?: string;
  staffNumber: string;
}

/**
 * Get random title from list
 */
function getRandomTitle(): string {
  return DEFAULT_TITLES[Math.floor(Math.random() * DEFAULT_TITLES.length)];
}

async function migrateTitles() {
  console.log(`Starting migration: Adding titles to ${LECTURERS_TABLE}...`);

  try {
    let recordsScanned = 0;
    let recordsUpdated = 0;
    let errors = 0;
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const params: any = {
        TableName: LECTURERS_TABLE,
        ProjectionExpression: 'lecturerId, firstName, lastName, title, staffNumber',
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await docClient.send(new ScanCommand(params));
      const items = (response.Items as LecturerRecord[]) || [];

      for (const lecturer of items) {
        recordsScanned++;

        // Skip if title already exists
        if (lecturer.title) {
          console.log(
            `✓ Skipping ${lecturer.staffNumber} (${lecturer.firstName} ${lecturer.lastName}) - already has title: ${lecturer.title}`
          );
          continue;
        }

        const newTitle = getRandomTitle();

        try {
          const updateParams = {
            TableName: LECTURERS_TABLE,
            Key: {
              lecturerId: lecturer.lecturerId,
            },
            UpdateExpression: 'SET title = :title, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':title': newTitle,
              ':updatedAt': Date.now(),
            },
            ReturnValues: 'ALL_NEW' as const,
          };

          await docClient.send(new UpdateCommand(updateParams));

          console.log(
            `✓ Updated ${lecturer.staffNumber} (${lecturer.firstName} ${lecturer.lastName}) with title: ${newTitle}`
          );
          recordsUpdated++;
        } catch (err) {
          errors++;
          console.error(
            `✗ Error updating ${lecturer.staffNumber}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log('\n=== Migration Summary ===');
    console.log(`Total records scanned: ${recordsScanned}`);
    console.log(`Records updated: ${recordsUpdated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Success rate: ${((recordsUpdated / recordsScanned) * 100).toFixed(2)}%`);

    if (errors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️ Migration completed with ${errors} error(s)`);
    }
  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateTitles().then(() => {
  process.exit(0);
});
