/**
 * Migration Script: Populate Module.departmentId from Course.departmentId
 * 
 * Purpose: Establish the relationship: Module → Course → Department
 * This ensures every module knows which department it belongs to
 * 
 * Usage: npx ts-node scripts/migrate-module-departments.ts
 */

import { ScanCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AwsConfig } from '../src/config/aws.config';
import dotenv from 'dotenv';

dotenv.config();

const docClient = AwsConfig.getDynamoDbClient();
const MODULES_TABLE = process.env.DYNAMODB_MODULES_TABLE || 'aitutor_modules';
const COURSES_TABLE = process.env.DYNAMODB_COURSES_TABLE || 'aitutor_courses';

interface Module {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  courseId?: string;
  departmentId?: string;
}

interface Course {
  courseId: string;
  courseCode: string;
  departmentId: string;
}

async function getCourseDepartment(courseId: string): Promise<string | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: COURSES_TABLE,
        Key: { courseId },
      })
    );
    return (response.Item as Course)?.departmentId || null;
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    return null;
  }
}

async function migrateModuleDepartments() {
  console.log('Starting migration: Populating Module.departmentId from Course.departmentId...\n');

  try {
    let modulesScanned = 0;
    let modulesUpdated = 0;
    let errors = 0;
    let skipped = 0;
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const params: any = {
        TableName: MODULES_TABLE,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await docClient.send(new ScanCommand(params));
      const modules = (response.Items as Module[]) || [];

      for (const module of modules) {
        modulesScanned++;

        // Skip if no courseId (can't determine department)
        if (!module.courseId) {
          console.log(`⚠️  Skipping ${module.moduleCode} (${module.moduleName}) - No courseId`);
          skipped++;
          continue;
        }

        // Skip if departmentId already exists
        if (module.departmentId) {
          console.log(`✓ Skipping ${module.moduleCode} (${module.moduleName}) - Already has departmentId: ${module.departmentId}`);
          skipped++;
          continue;
        }

        // Get departmentId from course
        const deptId = await getCourseDepartment(module.courseId);

        if (!deptId) {
          console.error(`✗ Error: Could not find departmentId for course ${module.courseId}`);
          errors++;
          continue;
        }

        try {
          await docClient.send(
            new UpdateCommand({
              TableName: MODULES_TABLE,
              Key: { moduleId: module.moduleId },
              UpdateExpression: 'SET departmentId = :deptId, updatedAt = :now',
              ExpressionAttributeValues: {
                ':deptId': deptId,
                ':now': Date.now(),
              },
              ReturnValues: 'ALL_NEW',
            })
          );

          console.log(`✅ Updated ${module.moduleCode} (${module.moduleName}) with departmentId: ${deptId}`);
          modulesUpdated++;
        } catch (err) {
          errors++;
          console.error(`✗ Error updating ${module.moduleCode}:`, err instanceof Error ? err.message : String(err));
        }
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log('\n=== Migration Summary ===');
    console.log(`Total modules scanned: ${modulesScanned}`);
    console.log(`Modules updated: ${modulesUpdated}`);
    console.log(`Modules skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Success rate: ${((modulesUpdated / (modulesScanned - skipped)) * 100).toFixed(2)}%`);

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
migrateModuleDepartments().then(() => {
  process.exit(0);
});
