/**
 * ProfilePictureService
 * Handles S3 operations for profile picture uploads
 */

import { AwsConfig } from '../config/aws.config';
import { EnvConfig } from '../config/environment';
import { LoggerUtil } from '../utils/logger.util';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, DeleteObjectCommand, PutObjectAclCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class ProfilePictureService {
  private s3Client = AwsConfig.getS3Client();
  private bucket = EnvConfig.get('S3_BUCKET');
  private region = EnvConfig.get('AWS_REGION');

  /**
   * Generate S3 key from user ID and MIME type
   */
  generateS3Key(userId: string, mimeType: string): string {
    const ext = this.getExtensionFromMimeType(mimeType);
    return `profile-pictures/${userId}/avatar.${ext}`;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return mimeMap[mimeType] || 'jpg';
  }

  /**
   * Generate presigned URL for S3 upload
   */
  async generatePresignedUrl(
    userId: string,
    fileName: string,
    mimeType: string
  ): Promise<{ uploadUrl: string; fileId: string; s3Key: string }> {
    try {
      const fileId = uuidv4();
      const s3Key = this.generateS3Key(userId, mimeType);

      // Create presigned URL for PUT
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      LoggerUtil.info('Generated presigned URL for profile picture', {
        userId,
        s3Key,
        fileId,
      });

      return { uploadUrl, fileId, s3Key };
    } catch (error) {
      LoggerUtil.error('Failed to generate presigned URL', { userId, error });
      throw error;
    }
  }

  /**
   * Generate public S3 URL for profile picture
   */
  getPublicUrl(s3Key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Make profile picture publicly readable
   */
  async makeObjectPublic(s3Key: string): Promise<void> {
    if (!s3Key) return;

    try {
      const command = new PutObjectAclCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);
      LoggerUtil.info('Made profile picture public', { s3Key });
    } catch (error) {
      LoggerUtil.warn('Failed to make profile picture public', { s3Key, error });
      // Don't throw - it's not critical
    }
  }

  /**
   * Delete old profile picture from S3
   */
  async deleteProfilePicture(s3Key: string): Promise<void> {
    if (!s3Key) return;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      LoggerUtil.info('Deleted old profile picture from S3', { s3Key });
    } catch (error) {
      LoggerUtil.warn('Failed to delete old profile picture', { s3Key, error });
      // Don't throw - it's not critical
    }
  }
  }

export default new ProfilePictureService();
