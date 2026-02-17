import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AIService } from '../../services/ai.service';
import { DynamoDBService } from '../../services/dynamodb.service';
import { getRagService } from '../../services/rag.service';
import { DatabaseConfig } from '../../config/database.config';
import { sendChatMessageSchema, createChatSessionSchema } from '../../models/schemas';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/error.util';
import { UuidUtil } from '../../utils/uuid.util';
import { ChatSession } from '../../models/types';

const tables = DatabaseConfig.getTables();

/**
 * POST /ai/chat/session - Create a new chat session
 */
export async function handleCreateSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT token and lookup student record
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const body = LambdaUtil.parseBody(event);

    if (!userId) {
      throw new BadRequestError('User authentication required');
    }

    // Query student by userId to get studentId
    let studentItems: any[] = [];
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = items;

    // If not found by userId, try email lookup (fallback)
    if ((!studentItems || studentItems.length === 0)) {
      const email = event.requestContext?.authorizer?.claims?.email;
      if (email) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items || [];
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentItems[0].studentId;

    // Validate input
    const input = createChatSessionSchema.parse(body);

    // If moduleId provided, verify enrollment
    if (input.moduleId) {
      const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
      if (!student || !student.moduleIds || !student.moduleIds.includes(input.moduleId)) {
        throw new ForbiddenError('You are not enrolled in this module');
      }
    }

    // Create session
    const now = new Date();
    const session: ChatSession = {
      sessionId: UuidUtil.generateChatSessionId(),
      studentId,
      moduleId: input.moduleId,
      contentIds: input.contentIds,
      title: input.title,
      createdAt: now.toISOString(), // Convert to ISO string for GSI compatibility
      updatedAt: now.toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days in Unix seconds
    };

    await DynamoDBService.put(tables.CHAT_SESSIONS, session);

    LoggerUtil.info('Chat session created', {
      sessionId: session.sessionId,
      studentId,
    });

    return ResponseUtil.lambdaResponse(
      201,
      ResponseUtil.success(session, 'Chat session created')
    );
  });
}

/**
 * GET /ai/chat/session/{sessionId} - Get chat session
 */
export async function handleGetSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT token and lookup student record
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const sessionId = LambdaUtil.getPathParam(event, 'sessionId');

    if (!userId || !sessionId) {
      throw new BadRequestError('User authentication and Session ID are required');
    }

    // Query student by userId to get studentId
    let studentItems: any[] = [];
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = items;

    // If not found by userId, try email lookup (fallback)
    if ((!studentItems || studentItems.length === 0)) {
      const email = event.requestContext?.authorizer?.claims?.email;
      if (email) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items || [];
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentItems[0].studentId;

    // Get session
    const session = await DynamoDBService.get(tables.CHAT_SESSIONS, { sessionId });
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    // Verify ownership
    if (session.studentId !== studentId) {
      throw new ForbiddenError('You cannot access this chat session');
    }

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(session));
  });
}

/**
 * POST /ai/chat/message - Send a message in chat
 */
export async function handleSendMessage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT token and lookup student record
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const sessionId = LambdaUtil.getPathParam(event, 'sessionId');
    const body = LambdaUtil.parseBody(event);

    if (!userId || !sessionId) {
      throw new BadRequestError('User authentication and Session ID are required');
    }

    // Query student by userId to get studentId
    let studentItems: any[] = [];
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = items;

    // If not found by userId, try email lookup (fallback)
    if ((!studentItems || studentItems.length === 0)) {
      const email = event.requestContext?.authorizer?.claims?.email;
      if (email) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items || [];
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentItems[0].studentId;

    // Validate input
    const input = sendChatMessageSchema.parse({
      sessionId,
      message: body.message,
    });

    // Get session
    const session = await DynamoDBService.get(tables.CHAT_SESSIONS, { sessionId });
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    // Verify ownership
    if (session.studentId !== studentId) {
      throw new ForbiddenError('You cannot access this chat session');
    }

    // Build context from selected content or module
    let context = '';
    const contextSources: any[] = [];

    // Priority 1: Use specific selected content IDs if available
    if (session.contentIds && Array.isArray(session.contentIds) && session.contentIds.length > 0) {
      LoggerUtil.info('Building context from selected content', {
        sessionId,
        contentCount: session.contentIds.length
      });

      for (const contentId of session.contentIds) {
        try {
          const file = await DynamoDBService.get(tables.FILES, { fileId: contentId });
          if (file) {
            context += `\nContent: ${file.fileName}\n${file.description || ''}\n`;
            contextSources.push({
              id: contentId,
              name: file.fileName,
              type: file.fileType,
              ragDocumentId: file.ragDocumentId
            });
            LoggerUtil.info('Added file to context', {
              fileId: contentId,
              fileName: file.fileName,
              ragDocumentId: file.ragDocumentId
            });
          }
        } catch (fileError) {
          LoggerUtil.warn('Failed to fetch content file', { contentId, error: fileError });
        }
      }
    }

    // Priority 2: Use all module content if no specific content selected
    if (!context && session.moduleId) {
      LoggerUtil.info('No specific content selected, using module context', {
        sessionId,
        moduleId: session.moduleId
      });

      const module = await DynamoDBService.get(tables.MODULES, { moduleId: session.moduleId });
      if (module) {
        context = `Module: ${module.moduleName}\n${module.description || ''}\n\nModule Contents:\n`;
        
        try {
          const { items: moduleFiles } = await DynamoDBService.query(
            tables.FILES,
            'moduleId = :moduleId',
            { ':moduleId': session.moduleId },
            { indexName: 'moduleId-index' }
          );
          
          if (moduleFiles && moduleFiles.length > 0) {
            for (const file of moduleFiles) {
              context += `\n- ${file.title || file.fileName}\n`;
              if (file.description) {
                context += `  Description: ${file.description}\n`;
              }
              if (file.ragDocumentId) {
                contextSources.push({
                  id: file.fileId,
                  name: file.title || file.fileName,
                  type: file.fileType,
                  ragDocumentId: file.ragDocumentId
                });
              }
            }
          }
        } catch (fileError) {
          LoggerUtil.warn('Failed to fetch module files', { moduleId: session.moduleId, error: fileError });
        }
        
        contextSources.push({
          id: session.moduleId,
          name: module.moduleName,
          type: 'module'
        });
      }
    }

    // Fetch conversation history (limited to last 10 messages for context)
    const { items: messageHistory } = await DynamoDBService.query(
      tables.CHAT_MESSAGES,
      'sessionId = :sessionId',
      { ':sessionId': sessionId },
      {
        indexName: 'sessionId-createdAt',
        limit: 10,
        scanIndexForward: true
      }
    );

    // Convert history to AI format
    const history = messageHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Try RAG first if configured
    let aiResponse: string;
    let ragUsed = false;
    let usedContextSources: any[] = [];
    const ragService = getRagService();

    if (ragService.isEnabled()) {
      try {
        // Get RAG document IDs - check if files have explicit ragDocumentId, else use module query
        let ragDocumentIds: string[] = [];
        
        // First try to get IDs from contextSources (for specific selected content)
        const contextRagIds = contextSources
          .filter((source) => source.ragDocumentId)
          .map((source) => source.ragDocumentId);
        
        if (contextRagIds.length > 0) {
          ragDocumentIds = contextRagIds;
          LoggerUtil.info('[RAG] Using document IDs from selected content', {
            contentCount: contextSources.length,
            ragDocumentCount: ragDocumentIds.length
          });
        } else {
          // If no explicit ragDocumentIds found, query for all RAG documents in the module
          ragDocumentIds = await getStudentRagDocumentIds(studentId, session.moduleId);
          
          LoggerUtil.info('[RAG] Using document IDs from student modules', {
            ragDocumentCount: ragDocumentIds.length,
            moduleId: session.moduleId
          });
        }

        if (ragDocumentIds.length > 0) {
          LoggerUtil.info('[RAG] Calling RAG chat service', {
            documentCount: ragDocumentIds.length,
            contextSourceCount: contextSources.length,
            contextSources,
            sessionId,
            studentId
          });

          const ragResponse = await ragService.chat(
            body.message,
            ragDocumentIds,
            history
          );

          aiResponse = ragResponse.answer;
          ragUsed = true;
          usedContextSources = contextSources;

          LoggerUtil.info('[RAG] RAG chat response received', {
            responseTime: ragResponse.response_time,
            chunksUsed: ragResponse.chunks_used,
            ragUsed: true,
            contextSources
          });
        } else {
          LoggerUtil.info('[RAG] No RAG documents available, using fallback', { 
            studentId,
            contextSources 
          });
          aiResponse = await AIService.chat(body.message, context, history);
          usedContextSources = contextSources;
        }
      } catch (ragError) {
        LoggerUtil.warn('[RAG] RAG chat failed, falling back to Claude', {
          error: ragError instanceof Error ? ragError.message : String(ragError),
          contextSources
        });
        aiResponse = await AIService.chat(body.message, context, history);
        usedContextSources = contextSources;
      }
    } else {
      // RAG not enabled, use Claude
      LoggerUtil.info('[RAG] RAG service disabled, using Claude fallback', { 
        studentId,
        contextSources 
      });
      aiResponse = await AIService.chat(body.message, context, history);
      usedContextSources = contextSources;
    }

    // Create timestamps (ISO 8601 for GSI compatibility)
    const now = new Date();
    const isoTimestamp = now.toISOString();

    // Create user message
    const userMessage = {
      messageId: UuidUtil.generateWithPrefix('msg'),
      sessionId,
      role: 'user' as const,
      content: body.message,
      createdAt: isoTimestamp,
    };

    // Persist user message
    await DynamoDBService.put(tables.CHAT_MESSAGES, userMessage);

    // Create assistant message
    const assistantMessage = {
      messageId: UuidUtil.generateWithPrefix('msg'),
      sessionId,
      role: 'assistant' as const,
      content: aiResponse,
      createdAt: new Date().toISOString(), // Slight delay to ensure different timestamp
    };

    // Persist assistant message
    await DynamoDBService.put(tables.CHAT_MESSAGES, assistantMessage);

    // Update session metadata
    await DynamoDBService.update(
      tables.CHAT_SESSIONS,
      { sessionId },
      {
        updatedAt: new Date().toISOString(),
        messageCount: (session.messageCount || 0) + 2,
      }
    );

    LoggerUtil.info('Chat message processed', {
      sessionId,
      studentId,
      messageCount: (session.messageCount || 0) + 2,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success({
        sessionId,
        userMessage,
        assistantMessage,
        timestamp: new Date().toISOString(),
        ragUsed,
      })
    );
  });
}

/**
 * GET /ai/chat/sessions - List user's chat sessions
 */
export async function handleListSessions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT token and lookup student record
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const { page, limit } = LambdaUtil.getPagination(event);

    if (!userId) {
      throw new BadRequestError('User authentication required');
    }

    // Query student by userId to get studentId
    let studentItems: any[] = [];
    let { items: studentQueryItems } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = studentQueryItems;

    // If not found by userId, try email lookup (fallback)
    if ((!studentItems || studentItems.length === 0)) {
      const email = event.requestContext?.authorizer?.claims?.email;
      if (email) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items || [];
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentItems[0].studentId;

    // Query sessions by user
    const { items, count } = await DynamoDBService.query(
      tables.CHAT_SESSIONS,
      'studentId = :studentId',
      { ':studentId': studentId },
      {
        indexName: 'studentId-createdAt',
        limit,
        scanIndexForward: false  // Most recent first
      }
    );

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(items, page, limit, count || items.length)
    );
  });
}

/**
 * GET /ai/chat/{sessionId}/messages - Get all messages in a chat session
 */
export async function handleGetMessages(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT token and lookup student record
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const sessionId = LambdaUtil.getPathParam(event, 'sessionId');
    const { page = 1, limit = 50 } = LambdaUtil.getPagination(event);

    if (!userId || !sessionId) {
      throw new BadRequestError('User authentication and Session ID are required');
    }

    // Query student by userId to get studentId
    let studentItems: any[] = [];
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = items;

    // If not found by userId, try email lookup (fallback)
    if ((!studentItems || studentItems.length === 0)) {
      const email = event.requestContext?.authorizer?.claims?.email;
      if (email) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items || [];
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentItems[0].studentId;

    // Verify session ownership
    const session = await DynamoDBService.get(tables.CHAT_SESSIONS, { sessionId });
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    if (session.studentId !== studentId) {
      throw new ForbiddenError('You cannot access this chat session');
    }

    // Query messages for this session
    const { items: messages, count } = await DynamoDBService.query(
      tables.CHAT_MESSAGES,
      'sessionId = :sessionId',
      { ':sessionId': sessionId },
      {
        indexName: 'sessionId-createdAt',
        limit,
        scanIndexForward: true  // Oldest first
      }
    );

    LoggerUtil.info('Chat messages retrieved', {
      sessionId,
      studentId,
      messageCount: messages.length,
    });

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.paginated(messages, page, limit, count || messages.length)
    );
  });
}

/**
 * DELETE /ai/chat/session/{sessionId} - Delete chat session
 */
export async function handleDeleteSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT token and lookup student record
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const sessionId = LambdaUtil.getPathParam(event, 'sessionId');

    if (!userId || !sessionId) {
      throw new BadRequestError('User authentication and Session ID are required');
    }

    // Query student by userId to get studentId
    let studentItems: any[] = [];
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = items;

    // If not found by userId, try email lookup (fallback)
    if ((!studentItems || studentItems.length === 0)) {
      const email = event.requestContext?.authorizer?.claims?.email;
      if (email) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items || [];
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentItems[0].studentId;

    // Get session
    const session = await DynamoDBService.get(tables.CHAT_SESSIONS, { sessionId });
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    // Verify ownership
    if (session.studentId !== studentId) {
      throw new ForbiddenError('You cannot delete this chat session');
    }

    // Delete session
    await DynamoDBService.delete(tables.CHAT_SESSIONS, { sessionId });

    LoggerUtil.info('Chat session deleted', { sessionId, studentId });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success({}, 'Chat session deleted'));
  });
}

/**
 * GET /api/file/{fileId} - Get file metadata directly by fileId
 * FALLBACK for orphaned files that exist in contentIds but not in module enrollment
 */
export async function handleGetFileMetadata(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    // Get userId from JWT token and lookup student record
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const fileId = LambdaUtil.getPathParam(event, 'fileId');

    if (!userId || !fileId) {
      throw new BadRequestError('User authentication and File ID are required');
    }

    // Query student by userId to get studentId
    let studentItems: any[] = [];
    let { items } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );
    studentItems = items;

    // If not found by userId, try email lookup (fallback)
    if ((!studentItems || studentItems.length === 0)) {
      const email = event.requestContext?.authorizer?.claims?.email;
      if (email) {
        LoggerUtil.info('Student not found by userId, trying email lookup', { userId, email });
        const emailResult = await DynamoDBService.query(
          tables.STUDENTS,
          'email = :email',
          { ':email': email },
          { indexName: 'email-index' }
        );
        studentItems = emailResult.items || [];
      }
    }

    if (!studentItems || studentItems.length === 0) {
      throw new NotFoundError('Student profile not found');
    }

    const studentId = studentItems[0].studentId;
    const student = studentItems[0];

    // Get file metadata
    const file = await DynamoDBService.get(tables.FILES, { fileId });
    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Check if student has access to this file
    // Access is granted if:
    // 1. Student is enrolled in the module where the file belongs, OR
    // 2. File is public/shared
    if (file.moduleId && student.moduleIds && !student.moduleIds.includes(file.moduleId)) {
      // Check if file has public access
      if (file.accessLevel !== 'PUBLIC' && file.accessLevel !== 'SHARED') {
        throw new ForbiddenError('You do not have access to this file');
      }
    }

    LoggerUtil.info('File metadata retrieved', {
      fileId,
      studentId,
      fileName: file.fileName,
    });

    return ResponseUtil.lambdaResponse(200, ResponseUtil.success(file));
  });
}

/**
 * Helper: Get RAG document IDs for student's modules
 * Queries the FILES table for documents processed by RAG
 * 
 * FIX (2026-01-23): Changed from querying by lecturerId (educator) to querying by moduleId (student's enrolled modules)
 * This ensures students only get RAG documents from their enrolled courses.
 */
async function getStudentRagDocumentIds(studentId: string, moduleId?: string): Promise<string[]> {
  try {
    LoggerUtil.info('[RAG] Looking up document IDs for student', { studentId, moduleId });

    // Get student record to find enrolled modules
    const student = await DynamoDBService.get(tables.STUDENTS, { studentId });
    
    if (!student || !student.moduleIds || student.moduleIds.length === 0) {
      LoggerUtil.info('[RAG] Student has no enrolled modules', { studentId });
      return [];
    }

    // Determine which modules to query
    const targetModuleIds = moduleId ? [moduleId] : student.moduleIds;
    
    // Verify if specific moduleId is valid (student must be enrolled)
    if (moduleId && !student.moduleIds.includes(moduleId)) {
      LoggerUtil.warn('[RAG] Student not enrolled in requested module', { studentId, moduleId });
      return [];
    }

    // Collect files from all target modules
    const allFiles: any[] = [];
    
    for (const mId of targetModuleIds) {
      try {
        // Query using moduleId GSI (not combining with ragProcessingStatus in key condition)
        const { items: moduleFiles } = await DynamoDBService.query(
          tables.FILES,
          'moduleId = :moduleId',
          { ':moduleId': mId },
          { indexName: 'moduleId-index' }
        );
        
        // Filter by ragProcessingStatus in application code
        const completeFiles = (moduleFiles || []).filter(f => f.ragProcessingStatus === 'COMPLETE');
        allFiles.push(...completeFiles);
        
        LoggerUtil.info('[RAG] Files found in module', { moduleId: mId, count: completeFiles?.length || 0 });
      } catch (moduleError) {
        LoggerUtil.warn('[RAG] Error querying module files', { moduleId: mId, error: moduleError });
        // Continue to next module instead of failing entirely
      }
    }

    // Extract unique RAG document IDs (in case of duplicates)
    const ragDocumentIds = Array.from(
      new Set(
        allFiles
          .filter(f => f.ragDocumentId && f.ragProcessingStatus === 'COMPLETE')
          .map(f => f.ragDocumentId)
      )
    );

    LoggerUtil.info('[RAG] Found document IDs', { 
      studentId,
      moduleCount: targetModuleIds.length,
      fileCount: allFiles.length,
      ragDocumentCount: ragDocumentIds.length,
      ragDocumentIds 
    });
    
    return ragDocumentIds;
  } catch (error) {
    LoggerUtil.error('[RAG] Error getting document IDs', { studentId, error });
    return [];
  }
}
