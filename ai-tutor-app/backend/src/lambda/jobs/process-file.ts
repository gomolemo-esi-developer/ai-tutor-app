/**
 * Lambda: Process File Job (Background Worker)
 * Triggered by SQS event from file processing queue
 * 
 * Purpose: Download file from S3 and send to RAG for processing
 * The RAG service will POST webhook callback when done
 * 
 * Environment:
 *   - FILE_PROCESSING_QUEUE_URL: Queue URL
 * Timeout: 5 minutes (300 seconds)
 * Memory: 1024 MB (for large file downloads)
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { S3Service } from '../../services/s3.service';
import { getRagService } from '../../services/rag.service';
import { LoggerUtil } from '../../utils/logger.util';

interface FileProcessingJob {
  fileId: string;
  s3Key: string;
  fileName: string;
  moduleId: string;
  callbackUrl: string;
  createdAt: number;
}

/**
 * Main handler - processes SQS messages containing file processing jobs
 */
export async function handleProcessFile(event: SQSEvent): Promise<void> {
  LoggerUtil.info('[JOB WORKER] Starting file processing batch', {
    messageCount: event.Records.length
  });

  const results = [];

  for (const record of event.Records) {
    try {
      const result = await processFileJob(record);
      results.push(result);
    } catch (error) {
      LoggerUtil.error('[JOB WORKER] Job failed - will retry', {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Throw error to let SQS retry based on queue settings
      throw error;
    }
  }

  LoggerUtil.info('[JOB WORKER] File batch processing complete', {
    totalMessages: event.Records.length,
    results
  });
}

/**
 * Process a single file job
 */
async function processFileJob(record: SQSRecord): Promise<{ success: boolean; fileId: string }> {
  try {
    const job: FileProcessingJob = JSON.parse(record.body);

    LoggerUtil.info('[JOB WORKER] Processing file', {
      fileId: job.fileId,
      fileName: job.fileName,
      s3Key: job.s3Key,
      messageId: record.messageId
    });

    // Step 1: Download file from S3
    LoggerUtil.info('[JOB WORKER] Downloading file from S3', {
      fileId: job.fileId,
      s3Key: job.s3Key
    });

    const fileBuffer = await S3Service.downloadFile(job.s3Key);

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Failed to download file from S3 - file is empty');
    }

    LoggerUtil.info('[JOB WORKER] File downloaded successfully', {
      fileId: job.fileId,
      fileSize: fileBuffer.length,
      fileSizeMB: (fileBuffer.length / 1024 / 1024).toFixed(2)
    });

    // Step 2: Call RAG service with callback URL
    LoggerUtil.info('[JOB WORKER] Calling RAG upload endpoint', {
      fileId: job.fileId,
      fileName: job.fileName,
      callbackUrl: job.callbackUrl ? '✓ Set' : '✗ Not set'
    });

    const ragService = getRagService();

    if (!ragService.isEnabled()) {
      throw new Error('RAG service not enabled - check RAG_SERVICE_URL configuration');
    }

    // RAG service will call the callback URL when processing completes
    // We don't wait for it - the webhook will update DynamoDB
    const ragResponse = await ragService.uploadDocument(
      fileBuffer,
      job.fileName,
      job.callbackUrl
    );

    LoggerUtil.info('[JOB WORKER] RAG upload initiated successfully', {
      fileId: job.fileId,
      documentId: ragResponse.documentId,
      chunks: ragResponse.chunkCount,
      textLength: ragResponse.textLength
    });

    return {
      success: true,
      fileId: job.fileId
    };

  } catch (error) {
    const job: FileProcessingJob = JSON.parse(record.body);

    LoggerUtil.error('[JOB WORKER] Failed to process file', {
      fileId: job.fileId,
      fileName: job.fileName,
      error: error instanceof Error ? error.message : String(error),
      messageId: record.messageId,
      attemptNumber: record.attributes?.ApproximateReceiveCount || '1'
    });

    // Re-throw so SQS will retry
    // After max retries, message goes to Dead Letter Queue
    throw error;
  }
}
