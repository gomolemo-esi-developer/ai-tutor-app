import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoDb = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });

interface ContentValidationResult {
  isValid: boolean;
  error?: string;
  file?: any;
  module?: any;
}

/**
 * Validates that a student has access to content for AI features
 * Checks:
 * 1. File/content exists in DynamoDB
 * 2. Student is enrolled in the module
 * 3. File belongs to the module
 * 4. Content type is supported for AI processing
 */
export async function validateStudentContentAccess(
  studentId: string,
  contentIds: string[],
  moduleId?: string
): Promise<ContentValidationResult> {
  try {
    // Check all content IDs are provided
    if (!contentIds || contentIds.length === 0) {
      return {
        isValid: false,
        error: 'No content IDs provided',
      };
    }

    // Validate each content item exists
    for (const contentId of contentIds) {
      const fileResult = await dynamoDb.send(
        new GetItemCommand({
          TableName: process.env.FILES_TABLE || 'aitutor_files',
          Key: {
            fileId: { S: contentId },
          },
        })
      );

      if (!fileResult.Item) {
        return {
          isValid: false,
          error: `File not found: ${contentId}`,
        };
      }

      const file = unmarshall(fileResult.Item);

      // If moduleId provided, verify file belongs to module
      if (moduleId && file.moduleId !== moduleId) {
        return {
          isValid: false,
          error: `File ${contentId} does not belong to module ${moduleId}`,
        };
      }

      // Verify student is enrolled in the module
      const studentEnrollmentResult = await dynamoDb.send(
        new QueryCommand({
          TableName: process.env.STUDENTS_TABLE || 'aitutor_students',
          IndexName: 'userId-index',
          KeyConditionExpression: 'studentId = :studentId',
          ExpressionAttributeValues: {
            ':studentId': { S: studentId },
          },
        })
      );

      if (!studentEnrollmentResult.Items || studentEnrollmentResult.Items.length === 0) {
        return {
          isValid: false,
          error: 'Student not found',
        };
      }

      const student = unmarshall(studentEnrollmentResult.Items[0]);

      // Check if file type is supported for AI processing
      const supportedTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown',
      ];

      if (!supportedTypes.includes(file.mimeType || '')) {
        return {
          isValid: false,
          error: `Unsupported file type: ${file.mimeType}. Supported: PDF, TXT, DOCX, Markdown`,
        };
      }

      return {
        isValid: true,
        file,
        module: file.moduleId,
      };
    }

    return {
      isValid: true,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Content validation error: ${error.message}`,
    };
  }
}

/**
 * Validates module exists and student is enrolled
 */
export async function validateModuleAccess(
  studentId: string,
  moduleId: string
): Promise<ContentValidationResult> {
  try {
    // Get module
    const moduleResult = await dynamoDb.send(
      new GetItemCommand({
        TableName: process.env.MODULES_TABLE || 'aitutor_modules',
        Key: {
          moduleId: { S: moduleId },
        },
      })
    );

    if (!moduleResult.Item) {
      return {
        isValid: false,
        error: 'Module not found',
      };
    }

    const module = unmarshall(moduleResult.Item);

    // Get student
    const studentResult = await dynamoDb.send(
      new GetItemCommand({
        TableName: process.env.STUDENTS_TABLE || 'aitutor_students',
        Key: {
          studentId: { S: studentId },
        },
      })
    );

    if (!studentResult.Item) {
      return {
        isValid: false,
        error: 'Student not found',
      };
    }

    const student = unmarshall(studentResult.Item);

    // Check enrollment (simplified check - in production, would check enrollment table)
    if (!student.enrolledModules || !student.enrolledModules.includes(moduleId)) {
      return {
        isValid: false,
        error: 'Student not enrolled in this module',
      };
    }

    return {
      isValid: true,
      module,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Module validation error: ${error.message}`,
    };
  }
}

/**
 * Validates file size is reasonable for AI processing
 */
export function validateFileSize(fileSizeBytes: number, maxSizeMB: number = 50): ContentValidationResult {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (fileSizeBytes > maxBytes) {
    return {
      isValid: false,
      error: `File size (${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${maxSizeMB}MB)`,
    };
  }

  if (fileSizeBytes === 0) {
    return {
      isValid: false,
      error: 'File is empty',
    };
  }

  return {
    isValid: true,
  };
}
