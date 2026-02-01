import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { getRagService } from '../../services/rag.service';
import { ForbiddenError } from '../../utils/error.util';

/**
 * GET /educator/files/{fileId}/chunks
 * Retrieve chunks for a specific file from RAG service
 */
export async function getFileChunks(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Authenticate
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);

    if (!userId || role !== 'EDUCATOR') {
      throw new ForbiddenError('Only educators can view chunks');
    }

    // Extract parameters
    const fileId = event.pathParameters?.fileId;
    const documentId = event.queryStringParameters?.documentId;
    const limit = parseInt(event.queryStringParameters?.limit || '100');

    if (!documentId) {
      throw new Error('Missing required parameter: documentId');
    }

    LoggerUtil.info('Fetching document chunks', {
      userId,
      fileId,
      documentId,
      limit,
    });

    // Call RAG service to get chunks
    const ragService = getRagService();
    const result = await ragService.getDocumentChunks(documentId, limit);

    LoggerUtil.info('Document chunks retrieved', {
      userId,
      documentId,
      chunkCount: result.total_chunks,
    });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(result));
  });
}

/**
 * GET /educator/files/{fileId}/chunks/{chunkIndex}
 * Retrieve a specific chunk by index
 */
export async function getFileChunk(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Authenticate
    const userId = LambdaUtil.getUserId(event);
    const role = LambdaUtil.getUserRole(event);

    if (!userId || role !== 'EDUCATOR') {
      throw new ForbiddenError('Only educators can view chunks');
    }

    // Extract parameters
    const fileId = event.pathParameters?.fileId;
    const chunkIndex = parseInt(event.pathParameters?.chunkIndex || '0');
    const documentId = event.queryStringParameters?.documentId;

    if (!documentId) {
      throw new Error('Missing required parameter: documentId');
    }

    LoggerUtil.info('Fetching specific chunk', {
      userId,
      fileId,
      documentId,
      chunkIndex,
    });

    // Get all chunks and extract the one requested
    const ragService = getRagService();
    const result = await ragService.getDocumentChunks(documentId, 1000);

    if (chunkIndex >= result.chunks.length) {
      throw new Error(`Chunk index ${chunkIndex} out of range`);
    }

    const chunk = result.chunks[chunkIndex];

    LoggerUtil.info('Chunk retrieved', {
      userId,
      documentId,
      chunkIndex,
      chunkLength: chunk.length,
    });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success({
      document_id: result.document_id,
      chunk: chunk,
      total_chunks: result.total_chunks,
    }));
  });
}
