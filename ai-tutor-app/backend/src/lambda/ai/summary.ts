import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AIService } from '../../services/ai.service';
import { DynamoDBService } from '../../services/dynamodb.service';
import { getRagService } from '../../services/rag.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/error.util';

const tables = DatabaseConfig.getTables();

/**
 * Helper function to extract studentId from JWT authentication
 */
async function getStudentIdFromAuth(event: APIGatewayProxyEvent): Promise<string> {
  const userId = event.requestContext?.authorizer?.claims?.sub;

  if (!userId) {
    throw new BadRequestError('User authentication required');
  }

  // Query student by userId to get studentId
  let { items } = await DynamoDBService.query(
    tables.STUDENTS,
    'userId = :userId',
    { ':userId': userId },
    { indexName: 'userId-index' }
  );

  // If not found by userId, try email lookup (fallback)
  if (!items || items.length === 0) {
    const email = event.requestContext?.authorizer?.claims?.email;
    if (email) {
      LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
      const emailResult = await DynamoDBService.query(
        tables.STUDENTS,
        'email = :email',
        { ':email': email },
        { indexName: 'email-index' }
      );
      items = emailResult.items || [];
    }
  }

  if (!items || items.length === 0) {
    throw new NotFoundError('Student profile not found');
  }

  return items[0].studentId;
}

/**
 * POST /api/summary/generate - Generate summary from module content
 */
export async function handleGenerateSummary(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const body = LambdaUtil.parseBody(event);
    const moduleId = body.moduleId;
    const contentIds = body.contentIds;
    const maxLength = body.maxLength || 500;

    if (!moduleId) {
      throw new BadRequestError('Module ID is required');
    }

    // Get studentId from JWT authentication
    const studentId = await getStudentIdFromAuth(event);

    // Get module by moduleCode (CS101) - scan required for non-key attribute
    const { items: modules } = await DynamoDBService.scan(
      tables.MODULES,
      {
        filterExpression: 'moduleCode = :code',
        expressionAttributeValues: { ':code': moduleId }
      }
    );
    
    if (!modules || modules.length === 0) {
      throw new NotFoundError('Module not found');
    }
    
    const module = modules[0];

    // Verify enrollment using actual moduleId from database
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    if (!student || !student.moduleIds || !student.moduleIds.includes(module.moduleId)) {
      throw new ForbiddenError('You are not enrolled in this module');
    }

    // Try RAG first if configured
    let summary: string;
    let ragUsed = false;

    const ragService = getRagService();
    if (ragService.isEnabled()) {
      try {
        // Get RAG documents for selected content items only
        let ragDocumentIds: string[] = [];
        
        if (contentIds && contentIds.length > 0) {
          // Get RAG documents only for selected content items
          for (const contentId of contentIds) {
            const file = await DynamoDBService.get(tables.FILES, { fileId: contentId });
            if (file && file.ragDocumentId && file.ragProcessingStatus === 'COMPLETE') {
              ragDocumentIds.push(file.ragDocumentId);
            }
          }
        } else {
          // Fallback: Get all RAG documents for this module if no content selected
          const { items: files } = await DynamoDBService.scan(
            tables.FILES,
            {
              filterExpression: 'moduleId = :moduleId AND attribute_exists(ragDocumentId) AND ragProcessingStatus = :complete',
              expressionAttributeValues: {
                ':moduleId': module.moduleId,
                ':complete': 'COMPLETE'
              }
            }
          );
          ragDocumentIds = (files || [])
            .filter(f => f.ragDocumentId && f.ragProcessingStatus === 'COMPLETE')
            .map(f => f.ragDocumentId);
        }

        if (ragDocumentIds.length > 0) {
          LoggerUtil.info('[RAG] Generating summary using RAG', {
            moduleId,
            documentCount: ragDocumentIds.length,
            studentId
          });

          // Call RAG chat endpoint with summary prompt
          const summaryPrompt = `Please provide a concise summary of the course materials in no more than ${maxLength} words.`;
          const ragResponse = await ragService.chat(
            summaryPrompt,
            ragDocumentIds,
            [] // No chat history for summary
          );

          summary = ragResponse.answer;
          ragUsed = true;

          LoggerUtil.info('[RAG] Summary generated by RAG', {
            moduleId,
            studentId,
            responseTime: ragResponse.response_time,
            ragUsed: true
          });
        } else {
          LoggerUtil.info('[RAG] No RAG documents available, using Claude fallback', {
            moduleId,
            studentId
          });
          summary = await AIService.generateSummary(
            module.content || module.description,
            maxLength
          );
        }
      } catch (ragError) {
        LoggerUtil.warn('[RAG] RAG summary generation failed, falling back to Claude', {
          error: ragError instanceof Error ? ragError.message : String(ragError),
          moduleId,
          studentId
        });
        summary = await AIService.generateSummary(
          module.content || module.description,
          maxLength
        );
      }
    } else {
      // RAG not enabled, use Claude
      LoggerUtil.info('[RAG] RAG service disabled, using Claude fallback', { studentId, moduleId });
      summary = await AIService.generateSummary(
        module.content || module.description,
        maxLength
      );
    }

    LoggerUtil.info('Summary generated', {
      moduleId,
      studentId,
      ragUsed
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        moduleId,
        contentIds,
        title: `${module.moduleName || module.title || 'Module'} - Summary`,
        summary,
        generatedAt: new Date().toISOString(),
        ragUsed,
      })
    );
  });
}
