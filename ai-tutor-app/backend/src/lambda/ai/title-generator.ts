import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../../services/dynamodb.service';
import { getRagService } from '../../services/rag.service';
import { DatabaseConfig } from '../../config/database.config';
import { ResponseUtil } from '../../utils/response.util';
import { LambdaUtil } from '../../utils/lambda.util';
import { LoggerUtil } from '../../utils/logger.util';
import { BadRequestError } from '../../utils/error.util';

const tables = DatabaseConfig.getTables();

/**
 * POST /api/student/chats/generate-titles
 * Batch generate titles for all chats that don't have descriptive titles
 */
export async function handleBatchGenerateTitles(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      throw new BadRequestError('User authentication required');
    }

    // Get student ID
    const { items: studentItems } = await DynamoDBService.query(
      tables.STUDENTS,
      'userId = :userId',
      { ':userId': userId },
      { indexName: 'userId-index' }
    );

    if (!studentItems || studentItems.length === 0) {
      throw new BadRequestError('Student not found');
    }

    const studentId = studentItems[0].studentId;

    // Get all chat sessions for this student
    const { items: allSessions } = await DynamoDBService.query(
      tables.CHAT_SESSIONS,
      'studentId = :studentId',
      { ':studentId': studentId }
    );

    if (!allSessions || allSessions.length === 0) {
      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success({ count: 0 }, 'No chats found')
      );
    }

    let updatedCount = 0;
    const ragService = getRagService();

    // Generate titles for chats that don't have descriptive ones
    for (const session of allSessions) {
      // Skip if already has a good title (not "New Chat" or generic)
      if (
        session.title &&
        session.title !== 'New Chat' &&
        !session.title.match(/^[A-Z]+\d* Discussion$/)
      ) {
        continue;
      }

      try {
        // Get messages for this session
        const { items: messages } = await DynamoDBService.query(
          tables.CHAT_MESSAGES,
          'sessionId = :sessionId',
          { ':sessionId': session.sessionId },
          { limit: 10, indexName: 'sessionId-createdAt' }
        );

        if (!messages || messages.length === 0) {
          continue;
        }

        // Extract conversation context - first user message and first AI response
        const userMessages = messages.filter((msg: any) => msg.role === 'user');
        const aiMessages = messages.filter((msg: any) => msg.role === 'assistant' || msg.role === 'ai');

        if (!userMessages || userMessages.length === 0) {
          continue;
        }

        // Build context from first exchange (user message + AI response)
        let conversationContext = userMessages[0]?.content || '';
        
        if (aiMessages && aiMessages.length > 0) {
          conversationContext += ' ' + aiMessages[0]?.content;
        }

        if (!conversationContext.trim()) {
          continue;
        }

        // Get module code/name if available
        let moduleCode = '';
        if (session.moduleId) {
          try {
            const module = await DynamoDBService.get(tables.MODULES, { moduleId: session.moduleId });
            moduleCode = module?.code || module?.moduleCode || session.moduleId;
          } catch (err) {
            moduleCode = session.moduleId;
          }
        }

        // Generate title
        let title = '';
        try {
          title = await ragService.generateChatTitle(
            conversationContext,
            moduleCode
          );
        } catch (err) {
          LoggerUtil.warn('RAG title generation failed, using local fallback', {
            sessionId: session.sessionId,
          });
          title = generateLocalTitle(
            conversationContext,
            moduleCode
          );
        }

        // Update session
        await DynamoDBService.update(
          tables.CHAT_SESSIONS,
          { sessionId: session.sessionId },
          {
            title,
            updatedAt: new Date().toISOString(),
          }
        );

        updatedCount++;
        LoggerUtil.info('Chat title updated', {
          sessionId: session.sessionId,
          title,
        });
      } catch (error) {
        LoggerUtil.error('Failed to generate title for chat', {
          sessionId: session.sessionId,
          error,
        });
        // Continue with next chat
      }
    }

    return ResponseUtil.lambdaResponse(
      200,
      ResponseUtil.success(
        { count: updatedCount, total: allSessions.length },
        `Generated ${updatedCount} chat titles`
      )
    );
  });
}

/**
 * POST /api/student/chat/:sessionId/generate-title
 * Generate a descriptive title for a chat session based on conversation history
 */
export async function handleGenerateTitleForChat(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return LambdaUtil.wrap(async () => {
    const sessionId = event.pathParameters?.sessionId;
    const body = LambdaUtil.parseBody(event);

    if (!sessionId) {
      throw new BadRequestError('Session ID is required');
    }

    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      throw new BadRequestError('User authentication required');
    }

    // Get the chat session
    const session = await DynamoDBService.get(tables.CHAT_SESSIONS, {
      sessionId,
    });

    if (!session) {
      throw new BadRequestError('Chat session not found');
    }

    // Get messages for the session
    const { items: messages } = await DynamoDBService.query(
      tables.CHAT_MESSAGES,
      'sessionId = :sessionId',
      { ':sessionId': sessionId },
      { limit: 10, indexName: 'sessionId-createdAt' }
    );

    if (!messages || messages.length === 0) {
      throw new BadRequestError('No messages found in this chat session');
    }

    // Extract conversation context - first user message and first AI response
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    const aiMessages = messages.filter((msg: any) => msg.role === 'assistant' || msg.role === 'ai');

    if (!userMessages || userMessages.length === 0) {
      throw new BadRequestError('No user messages to analyze');
    }

    // Build context from first exchange (user message + AI response)
    let conversationContext = userMessages[0]?.content || '';
    
    if (aiMessages && aiMessages.length > 0) {
      conversationContext += ' ' + aiMessages[0]?.content;
    }

    if (!conversationContext.trim()) {
      throw new BadRequestError('No conversation content to analyze');
    }

    // Get module code/name if available
    let moduleCode = '';
    if (session.moduleId) {
      try {
        const module = await DynamoDBService.get(tables.MODULES, { moduleId: session.moduleId });
        moduleCode = module?.code || module?.moduleCode || session.moduleId;
      } catch (err) {
        LoggerUtil.warn('Failed to fetch module details', { moduleId: session.moduleId });
        moduleCode = session.moduleId;
      }
    }

    try {
      // Use RAG service to generate a smart title based on full first exchange
      const ragService = getRagService();
      const title = await ragService.generateChatTitle(
        conversationContext,
        moduleCode
      );

      // Update the session with the new title
      const updatedSession = {
        ...session,
        title,
        updatedAt: new Date().toISOString(),
      };

      await DynamoDBService.update(tables.CHAT_SESSIONS, { sessionId }, {
        title,
        updatedAt: new Date().toISOString(),
      });

      LoggerUtil.info('Chat title generated', { sessionId, title });

      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success(
          { title, sessionId },
          'Title generated successfully'
        )
      );
    } catch (error) {
      LoggerUtil.error('Failed to generate title via RAG', error);

      // Fallback: generate title locally from first exchange (user + AI response)
      const fallbackTitle = generateLocalTitle(conversationContext, moduleCode);

      // Update the session with fallback title
      await DynamoDBService.update(tables.CHAT_SESSIONS, { sessionId }, {
        title: fallbackTitle,
        updatedAt: new Date().toISOString(),
      });

      LoggerUtil.info('Using fallback title generation', {
        sessionId,
        title: fallbackTitle,
      });

      return ResponseUtil.lambdaResponse(
        200,
        ResponseUtil.success(
          { title: fallbackTitle, sessionId },
          'Title generated (fallback method)'
        )
      );
    }
  });
}

/**
 * Local title generation (fallback when RAG is unavailable)
 */
function generateLocalTitle(messageText: string, moduleCode?: string): string {
  if (!messageText) {
    return moduleCode ? `${moduleCode} Discussion` : 'Conversation';
  }

  // Clean and normalize
  let title = messageText
    .replace(/^(user|ai|assistant|me):\s*/i, '')
    .trim();

  // Remove question starters
  const patterns = [
    /^(explain|what|how|why|can you|tell me|show me|help|does|what's|who|when|where)\s+(?:about\s+)?/i,
    /^(is|are|have|has|should|could|would|will|do|did|does|must|may|might)\s+/i,
    /^(give|provide|create|make|build|write|generate|summarize|compare|contrast|analyze|describe|define)\s+(?:me\s+)?/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      title = title.substring(match[0].length).trim();
      break;
    }
  }

  // Fallback if too much was removed
  if (!title || title.length < 3) {
    title = messageText
      .replace(/^(user|ai|assistant|me):\s*/i, '')
      .trim();
  }

  // Clean trailing punctuation
  title = title.replace(/[?!.]+$/, '').trim();

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Smart truncation
  if (title.length > 45) {
    const truncated = title.substring(0, 45);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 20) {
      title = truncated.substring(0, lastSpace) + '...';
    } else {
      title = truncated + '...';
    }
  }

  // Combine with module code
  if (moduleCode) {
    return `${moduleCode} • ${title}`;
  }

  return title;
}
