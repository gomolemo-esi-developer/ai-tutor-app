/**
 * Migration Script: Add courseId to students based on their primary enrolled module
 * 
 * Logic: Get student's first module → Get that module's courseId → Assign to student.courseId
 * 
 * Usage: npx ts-node scripts/migrate-student-courseId.ts
 */

import { ScanCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AwsConfig } from '../src/config/aws.config';
import dotenv from 'dotenv';

dotenv.config();

const docClient = AwsConfig.getDynamoDbClient();
const STUDENTS_TABLE = process.env.DYNAMODB_STUDENTS_TABLE || 'aitutor_students';
const MODULES_TABLE = process.env.DYNAMODB_MODULES_TABLE || 'aitutor_modules';

interface Student {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  moduleIds?: string[];
  courseId?: string;
}

async function getModuleCourseId(moduleId: string): Promise<string | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: MODULES_TABLE,
        Key: { moduleId },
      })
    );
    return (response.Item as any)?.courseId || null;
  } catch (error) {
    console.error(`Error fetching module ${moduleId}:`, error);
    return null;
  }
}

async function migrateStudentCourseIds() {
  console.log('Starting migration: Adding courseId to students...\n');

  try {
    let studentsScanned = 0;
    let studentsUpdated = 0;
    let errors = 0;
    let skipped = 0;
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const params: any = {
        TableName: STUDENTS_TABLE,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await docClient.send(new ScanCommand(params));
      const students = (response.Items as Student[]) || [];

      for (const student of students) {
        studentsScanned++;

        // Skip if no modules or already has courseId
        if (!student.moduleIds || student.moduleIds.length === 0) {
          console.log(`⚠️  Skipping ${student.studentNumber} - No enrolled modules`);
          skipped++;
          continue;
        }

        if (student.courseId) {
          console.log(`✓ Skipping ${student.studentNumber} - Already has courseId`);
          skipped++;
          continue;
        }

        // Get courseId from first module
        const firstModuleId = student.moduleIds[0];
        const courseId = await getModuleCourseId(firstModuleId);

        if (!courseId) {
          console.error(`✗ Error: Could not find courseId for module ${firstModuleId}`);
          errors++;
          continue;
        }

        try {
          await docClient.send(
            new UpdateCommand({
              TableName: STUDENTS_TABLE,
              Key: { studentId: student.studentId },
              UpdateExpression: 'SET courseId = :courseId, updatedAt = :now',
              ExpressionAttributeValues: {
                ':courseId': courseId,
                ':now': Date.now(),
              },
              ReturnValues: 'ALL_NEW',
            })
          );

          console.log(`✅ Updated ${student.studentNumber} with courseId: ${courseId}`);
          studentsUpdated++;
        } catch (err) {
          errors++;
          console.error(`✗ Error updating ${student.studentNumber}:`, err instanceof Error ? err.message : String(err));
        }
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log('\n=== Migration Summary ===');
    console.log(`Total students scanned: ${studentsScanned}`);
    console.log(`Students updated: ${studentsUpdated}`);
    console.log(`Students skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Success rate: ${((studentsUpdated / (studentsScanned - skipped)) * 100).toFixed(2)}%`);

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
migrateStudentCourseIds().then(() => {
  process.exit(0);
});
