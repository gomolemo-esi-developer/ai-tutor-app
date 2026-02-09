import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsConfig } from '../config/aws.config';
import { EnvConfig } from '../config/environment';
import { LoggerUtil } from '../utils/logger.util';
import { InternalServerError } from '../utils/error.util';

/**
 * S3 service for file operations
 * Note: AWS S3 client is initialized in AwsConfig, not duplicated here
 */
export class S3Service {
  private static client = AwsConfig.getS3Client();
  private static bucket = EnvConfig.get('S3_BUCKET');

  /**
   * Generate presigned upload URL
   */
  static async generateUploadUrl(
    key: string,
    expirySeconds: number = 900 // 15 minutes
  ): Promise<string> {
    try {
      const bucket = this.bucket;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      // Generate URL
      let url = await getSignedUrl(this.client, command, {
        expiresIn: expirySeconds,
      });
      
      const originalUrl = url;
      
      // Convert path-style to virtual-hosted style if using path-style
      if (url.includes('s3.amazonaws.com/') && !url.includes('.s3.')) {
        const region = EnvConfig.get('AWS_REGION');
        // Extract query string
        const queryIndex = url.indexOf('?');
        const queryString = queryIndex > -1 ? url.substring(queryIndex) : '';
        // Extract key (everything after bucket)
        const pathMatch = url.match(/amazonaws\.com\/([^?]*)/);
        if (pathMatch) {
          const keyPath = pathMatch[1];
          url = `https://${bucket}.s3.${region}.amazonaws.com/${keyPath}${queryString}`;
        }
      }

      LoggerUtil.info('Generated upload URL', { key, originalUrl, convertedUrl: url, isConverted: url !== originalUrl });
      return url;
    } catch (error) {
      LoggerUtil.error('Failed to generate upload URL', error as Error);
      throw new InternalServerError('Failed to generate upload URL');
    }
  }

  /**
   * Generate presigned download URL
   */
  static async generateDownloadUrl(
    key: string,
    expirySeconds: number = 900, // 15 minutes
    fileName?: string
  ): Promise<string> {
    try {
      const bucket = this.bucket;
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: fileName ? `attachment; filename="${fileName}"` : 'attachment',
      });

      // Generate URL
      let url = await getSignedUrl(this.client, command, {
        expiresIn: expirySeconds,
      });
      
      const originalUrl = url;
      
      // Convert path-style to virtual-hosted style if using path-style
      if (url.includes('s3.amazonaws.com/') && !url.includes('.s3.')) {
        const region = EnvConfig.get('AWS_REGION');
        // Extract query string
        const queryIndex = url.indexOf('?');
        const queryString = queryIndex > -1 ? url.substring(queryIndex) : '';
        // Extract key (everything after bucket)
        const pathMatch = url.match(/amazonaws\.com\/([^?]*)/);
        if (pathMatch) {
          const keyPath = pathMatch[1];
          url = `https://${bucket}.s3.${region}.amazonaws.com/${keyPath}${queryString}`;
        }
      }

      LoggerUtil.info('Generated download URL', { key, fileName, originalUrl, convertedUrl: url, isConverted: url !== originalUrl });
      return url;
    } catch (error) {
      LoggerUtil.error('Failed to generate download URL', error as Error);
      throw new InternalServerError('Failed to generate download URL');
    }
  }

  /**
   * Download file from S3 as Buffer
   * Used for RAG service integration
   */
  static async downloadFile(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        LoggerUtil.warn('File body is empty', { key });
        return null;
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const reader = response.Body as any;
      
      if (reader.readable) {
        // Node.js stream
        for await (const chunk of reader) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
      } else if (reader instanceof Uint8Array) {
        // Uint8Array
        chunks.push(Buffer.from(reader));
      } else {
        // Assume it's already a buffer-like
        chunks.push(Buffer.from(reader));
      }

      const buffer = Buffer.concat(chunks);
      LoggerUtil.debug('File downloaded from S3', { key, size: buffer.length });
      return buffer;
    } catch (error) {
      LoggerUtil.error('Failed to download file from S3', error as Error);
      return null;
    }
  }

  /**
   * Upload file directly (for small files)
   */
  static async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.client.send(command);
      LoggerUtil.debug('File uploaded', { key, contentType });
    } catch (error) {
      LoggerUtil.error('Failed to upload file', error as Error);
      throw new InternalServerError('Failed to upload file');
    }
  }

  /**
   * Delete a single file
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      LoggerUtil.debug('File deleted', { key });
    } catch (error) {
      LoggerUtil.error('Failed to delete file', error as Error);
      throw new InternalServerError('Failed to delete file');
    }
  }

  /**
   * Delete multiple files
   */
  static async deleteFiles(keys: string[]): Promise<void> {
    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });

      await this.client.send(command);
      LoggerUtil.debug('Files deleted', { count: keys.length });
    } catch (error) {
      LoggerUtil.error('Failed to delete files', error as Error);
      throw new InternalServerError('Failed to delete files');
    }
  }

  /**
   * List files in a prefix
   */
  static async listFiles(prefix: string, maxKeys: number = 100): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.client.send(command);
      const keys = response.Contents?.map((obj) => obj.Key || '') || [];

      LoggerUtil.debug('Files listed', { prefix, count: keys.length });
      return keys;
    } catch (error) {
      LoggerUtil.error('Failed to list files', error as Error);
      throw new InternalServerError('Failed to list files');
    }
  }

  /**
   * Generate S3 key for a file
   */
  static generateS3Key(userId: string, fileId: string, fileName: string): string {
    const timestamp = Date.now();
    return `uploads/${userId}/${fileId}/${timestamp}-${fileName}`;
  }

  /**
   * Get bucket name
   */
  static getBucket(): string {
    return this.bucket;
  }
}
