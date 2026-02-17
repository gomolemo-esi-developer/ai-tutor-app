/**
 * Chat Title Initialization Service
 * Automatically generates titles for all existing chats with generic titles
 * Runs once on backend startup
 */

import { DynamoDBService } from './dynamodb.service';
import { getRagService } from './rag.service';
import { DatabaseConfig } from '../config/database.config';
import { LoggerUtil } from '../utils/logger.util';

const tables = DatabaseConfig.getTables();
let initializationRunning = false;
let initializationComplete = false;

/**
 * Start the chat title initialization process
 * Can be called multiple times, but will only run once
 */
export async function initializeChatTitles(): Promise<void> {
  if (initializationComplete || initializationRunning) {
    LoggerUtil.debug('Chat title initialization already running or complete', {
      running: initializationRunning,
      complete: initializationComplete,
    });
    return;
  }

  initializationRunning = true;
  LoggerUtil.info('🚀 Chat title initialization started');

  try {
    // Get all chat sessions
    let allSessions: any[] = [];
    try {
      const result = await DynamoDBService.scan(tables.CHAT_SESSIONS);
      allSessions = result.items || [];
    } catch (scanError) {
      LoggerUtil.error('Failed to scan chat sessions', scanError);
      // Try to continue even if scan fails
      allSessions = [];
    }

    if (!allSessions || allSessions.length === 0) {
      LoggerUtil.info('📭 No chat sessions found for title initialization');
      initializationComplete = true;
      initializationRunning = false;
      return;
    }

    LoggerUtil.info(`📊 Found ${allSessions.length} chat sessions to process`, {
      sessionCount: allSessions.length,
    });

    const ragService = getRagService();
    let updatedCount = 0;
    let skippedCount = 0;

    // Process chats in batches to avoid overwhelming the RAG service
    const batchSize = 5;
    for (let i = 0; i < allSessions.length; i += batchSize) {
      const batch = allSessions.slice(i, i + batchSize);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((session) =>
          generateTitleForChat(session, ragService)
        )
      );

      // Count results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value) {
            updatedCount++;
          } else {
            skippedCount++;
          }
        }
      });

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allSessions.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    LoggerUtil.info('✅ Chat title initialization complete', {
      total: allSessions.length,
      updated: updatedCount,
      skipped: skippedCount,
      updateRate: `${Math.round((updatedCount / allSessions.length) * 100)}%`,
    });

    initializationComplete = true;
    initializationRunning = false;
  } catch (error) {
    LoggerUtil.error('❌ Chat title initialization failed', error);
    initializationRunning = false;
    // Don't mark as complete on error, allow retry
  }
}

/**
 * Generate title for a single chat session
 * Returns true if title was generated, false if skipped
 */
async function generateTitleForChat(
  session: any,
  ragService: any
): Promise<boolean> {
  try {
    // Skip if already has a good title
    if (
      session.title &&
      session.title !== 'New Chat' &&
      !session.title.match(/^[A-Z]+\d*\s+Discussion$/)
    ) {
      return false;
    }

    // Get messages for this session
    const { items: messages } = await DynamoDBService.query(
      tables.CHAT_MESSAGES,
      'sessionId = :sessionId',
      { ':sessionId': session.sessionId },
      { limit: 10, indexName: 'sessionId-createdAt' }
    );

    if (!messages || messages.length === 0) {
      return false;
    }

    // Extract user messages
    const userMessages = messages
      .filter((msg: any) => msg.role === 'user')
      .map((msg: any) => msg.content)
      .join(' ');

    if (!userMessages.trim()) {
      return false;
    }

    // Generate title
    let title = '';
    try {
      title = await ragService.generateChatTitle(
        userMessages,
        session.moduleCode || session.moduleId
      );
    } catch (err) {
      LoggerUtil.debug('RAG title generation failed, using local fallback', {
        sessionId: session.sessionId,
      });
      title = generateLocalTitle(
        userMessages,
        session.moduleCode || session.moduleId
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

    LoggerUtil.debug('Chat title generated', {
      sessionId: session.sessionId,
      title,
    });

    return true;
  } catch (error) {
    LoggerUtil.debug('Failed to generate title for chat', {
      sessionId: session.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Local title generation (fallback)
 */
function generateLocalTitle(messageText: string, moduleCode?: string): string {
  if (!messageText) {
    return moduleCode ? `${moduleCode} Discussion` : 'Conversation';
  }

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

  if (!title || title.length < 3) {
    title = messageText
      .replace(/^(user|ai|assistant|me):\s*/i, '')
      .trim();
  }

  title = title.replace(/[?!.]+$/, '').trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  if (title.length > 45) {
    const truncated = title.substring(0, 45);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 20) {
      title = truncated.substring(0, lastSpace) + '...';
    } else {
      title = truncated + '...';
    }
  }

  if (moduleCode) {
    return `${moduleCode} • ${title}`;
  }

  return title;
}

/**
 * Check if initialization is complete
 */
export function isChatTitleInitializationComplete(): boolean {
  return initializationComplete;
}
