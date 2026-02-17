/**
 * User Profile Picture Handlers
 * POST /api/user/profile-picture/upload-link - Get presigned URL
 * POST /api/user/profile-picture - Save metadata
 * DELETE /api/user/profile-picture - Delete picture
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/error.util';
import { uploadProfilePictureSchema, saveProfilePictureSchema } from '../../models/schemas';
import ProfilePictureService from '../../services/profile-picture.service';

const tables = DatabaseConfig.getTables();

/**
 * POST /api/user/profile-picture/upload-link
 * Get presigned URL for S3 upload
 */
export async function handleGetUploadLink(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    if (!userId) throw new ForbiddenError('User not authenticated');

    const body = LambdaUtil.parseBody(event);
    const validated = uploadProfilePictureSchema.parse(body);

    LoggerUtil.info('Getting upload link for profile picture', {
      userId,
      fileName: validated.fileName,
    });

    // Get current user to check for existing picture
    const user = await DynamoDBService.get(tables.USERS, { userId });
    if (!user) throw new NotFoundError('User not found');

    // Delete old picture if exists
    if (user.profilePictureKey) {
      await ProfilePictureService.deleteProfilePicture(user.profilePictureKey);
    }

    // Generate presigned URL
    const { uploadUrl, fileId, s3Key } =
      await ProfilePictureService.generatePresignedUrl(
        userId,
        validated.fileName,
        validated.mimeType
      );

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        uploadUrl,
        fileId,
        s3Key,
      })
    );
  });
}

/**
 * POST /api/user/profile-picture
 * Save profile picture metadata after S3 upload
 */
export async function handleSaveProfilePicture(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    if (!userId) throw new ForbiddenError('User not authenticated');

    const body = LambdaUtil.parseBody(event);
    const validated = saveProfilePictureSchema.parse(body);

    LoggerUtil.info('Saving profile picture metadata', {
      userId,
      s3Key: validated.s3Key,
    });

    // Make the object publicly readable
     await ProfilePictureService.makeObjectPublic(validated.s3Key);

     // Generate public URL
     const profilePictureUrl =
       ProfilePictureService.getPublicUrl(validated.s3Key);

     // Update user with profile picture URL
     await DynamoDBService.update(
       tables.USERS,
       { userId },
       {
         profilePictureUrl,
         profilePictureKey: validated.s3Key,
         updatedAt: Date.now(),
       }
     );

    LoggerUtil.info('Profile picture saved', {
      userId,
      url: profilePictureUrl,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        profilePictureUrl,
      })
    );
  });
}

/**
 * DELETE /api/user/profile-picture
 * Delete profile picture
 */
export async function handleDeleteProfilePicture(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = LambdaUtil.getUserId(event);
    if (!userId) throw new ForbiddenError('User not authenticated');

    LoggerUtil.info('Deleting profile picture', { userId });

    // Get user
    const user = await DynamoDBService.get(tables.USERS, { userId });
    if (!user) throw new NotFoundError('User not found');

    // Delete from S3
    if (user.profilePictureKey) {
      await ProfilePictureService.deleteProfilePicture(user.profilePictureKey);
    }

    // Clear from DynamoDB
    await DynamoDBService.update(
      tables.USERS,
      { userId },
      {
        profilePictureUrl: null,
        profilePictureKey: null,
        updatedAt: Date.now(),
      }
    );

    LoggerUtil.info('Profile picture deleted', { userId });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({ success: true })
    );
  });
}
