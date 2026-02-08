/**
 * Webhook Handler: File Processing Completion
 * Called by RAG18Nov2025-1 when file processing completes
 * 
 * Endpoint: POST /api/internal/file-processed/{fileId}
 * Source: RAG service webhook callback
 * 
 * Purpose: Receive RAG processing status and update DynamoDB file record
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LoggerUtil } from '../../utils/logger.util';

const tables = DatabaseConfig.getTables();

export async function handleFileProcessed(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const fileId = event.pathParameters?.fileId;

    if (!fileId) {
      LoggerUtil.warn('[WEBHOOK] No fileId in path');
      return ResponseUtil.lambdaResponse(400, {
        error: 'BAD_REQUEST',
        message: 'fileId required in path'
      });
    }

    // Parse request body
    let body: any;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      LoggerUtil.error('[WEBHOOK] Failed to parse body', parseError);
      return ResponseUtil.lambdaResponse(400, {
        error: 'INVALID_JSON',
        message: 'Request body must be valid JSON'
      });
    }

    LoggerUtil.info('[WEBHOOK] File processing completed notification', {
      fileId,
      status: body.status,
      documentId: body.documentId,
      chunks: body.chunks
    });

    // Validate webhook payload
    if (!body.status || !['COMPLETE', 'FAILED'].includes(body.status)) {
      LoggerUtil.warn('[WEBHOOK] Invalid status', { 
        fileId,
        status: body.status 
      });
      return ResponseUtil.lambdaResponse(400, {
        error: 'INVALID_STATUS',
        message: 'status must be COMPLETE or FAILED'
      });
    }

    // Prepare update data
    const updateData: any = {
      ragProcessingStatus: body.status,
      updatedAt: Date.now()
    };

    if (body.status === 'COMPLETE') {
      // Validate required fields for COMPLETE status
      if (!body.documentId) {
        LoggerUtil.warn('[WEBHOOK] COMPLETE status but no documentId', { fileId });
        return ResponseUtil.lambdaResponse(400, {
          error: 'MISSING_DOCUMENT_ID',
          message: 'documentId required for COMPLETE status'
        });
      }

      updateData.ragDocumentId = body.documentId;
      updateData.ragChunkCount = body.chunks || 0;
      updateData.ragProcessedAt = new Date().toISOString();
      updateData.ragError = null; // Clear any previous error

      LoggerUtil.info('[WEBHOOK] File processing succeeded', {
        fileId,
        documentId: body.documentId,
        chunks: body.chunks,
        textLength: body.textLength
      });

    } else if (body.status === 'FAILED') {
      // Store error message for debugging
      updateData.ragError = body.error || 'Unknown error during RAG processing';

      LoggerUtil.warn('[WEBHOOK] File processing failed', {
        fileId,
        error: updateData.ragError
      });
    }

    // Update file record in DynamoDB
    await DynamoDBService.update(
      tables.FILES,
      { fileId },
      updateData
    );

    LoggerUtil.info('[WEBHOOK] DynamoDB updated successfully', {
      fileId,
      status: body.status
    });

    return ResponseUtil.lambdaResponse(200, {
      success: true,
      message: 'File status updated successfully',
      fileId,
      status: body.status
    });

  } catch (error) {
    LoggerUtil.error('[WEBHOOK] Unexpected error processing file completion', error);
    return ResponseUtil.lambdaResponse(500, {
      error: 'INTERNAL_ERROR',
      message: 'Failed to update file status'
    });
  }
}
