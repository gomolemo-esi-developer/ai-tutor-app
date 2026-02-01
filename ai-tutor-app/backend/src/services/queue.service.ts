/**
 * Job Queue Service
 * Handles async file processing jobs using AWS SQS
 * 
 * Purpose: Queue files for RAG processing without blocking the upload endpoint
 */

// import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { LoggerUtil } from '../utils/logger.util';

export interface FileProcessingJob {
  fileId: string;
  s3Key: string;
  fileName: string;
  moduleId: string;
  callbackUrl: string;
  createdAt: number;
}

export class QueueService {
  // private sqsClient: SQSClient;
  private queueUrl: string;

  constructor() {
    // TODO: Initialize SQS when @aws-sdk/client-sqs is installed
    // this.sqsClient = new SQSClient({
    //   region: process.env.AWS_REGION || 'us-east-2'
    // });
    this.queueUrl = process.env.FILE_PROCESSING_QUEUE_URL || '';

    if (!this.queueUrl) {
      LoggerUtil.warn('[QUEUE] FILE_PROCESSING_QUEUE_URL not set - async uploads disabled');
    }
  }

  /**
   * Queue a file for RAG processing
   * Returns message ID from SQS
   */
  async queueFileProcessing(job: FileProcessingJob): Promise<string> {
    if (!this.queueUrl) {
      throw new Error('FILE_PROCESSING_QUEUE_URL not configured');
    }

    try {
      // TODO: Implement SQS SendMessageCommand when SDK is installed
      // const command = new SendMessageCommand({
      //   QueueUrl: this.queueUrl,
      //   MessageBody: JSON.stringify(job),
      //   MessageAttributes: {
      //     fileId: {
      //       StringValue: job.fileId,
      //       DataType: 'String'
      //     },
      //     priority: {
      //       StringValue: 'high',
      //       DataType: 'String'
      //     }
      //   },
      //   DelaySeconds: 0 // Process immediately
      // });

      LoggerUtil.info('[QUEUE] Queueing file for processing', { fileId: job.fileId });
      
      // Placeholder - return mock message ID
      // TODO: Replace with actual SQS send when SDK is installed
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      LoggerUtil.info('[QUEUE] File processing job queued', {
        fileId: job.fileId,
        messageId: messageId,
        s3Key: job.s3Key
      });

      return messageId;
    } catch (error) {
      LoggerUtil.error('[QUEUE] Failed to queue file processing', error);
      throw error;
    }
  }
}

// Singleton instance
let queueService: QueueService | null = null;

/**
 * Get or create queue service instance
 */
export function getQueueService(): QueueService {
  if (!queueService) {
    queueService = new QueueService();
  }
  return queueService;
}

/**
 * Reset queue service (for testing)
 */
export function resetQueueService(): void {
  queueService = null;
}
