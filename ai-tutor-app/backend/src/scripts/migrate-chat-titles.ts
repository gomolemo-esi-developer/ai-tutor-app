/**
 * Migration Script: Generate titles for all existing chats
 * Run: npx ts-node src/scripts/migrate-chat-titles.ts
 */

import { DynamoDBService } from '../services/dynamodb.service';
import { getRagService } from '../services/rag.service';
import { DatabaseConfig } from '../config/database.config';
import { LoggerUtil } from '../utils/logger.util';

const tables = DatabaseConfig.getTables();

async function generateLocalTitle(messageText: string, moduleCode?: string): Promise<string> {
  if (!messageText) {
    return moduleCode ? `${moduleCode} Discussion` : 'Conversation';
  }

  let title = messageText
    .replace(/^(user|ai|assistant|me):\s*/i, '')
    .trim();

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

async function migrateChatTitles(): Promise<void> {
  console.log('\n🚀 Starting Chat Titles Migration...\n');

  try {
    // Get all chat sessions
    const { items: allSessions } = await DynamoDBService.scan(tables.CHAT_SESSIONS);

    if (!allSessions || allSessions.length === 0) {
      console.log('❌ No chat sessions found');
      return;
    }

    console.log(`📊 Found ${allSessions.length} chat sessions\n`);

    const ragService = await getRagService();
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each chat
    for (let i = 0; i < allSessions.length; i++) {
      const session = allSessions[i];
      const progress = `[${i + 1}/${allSessions.length}]`;

      // Skip if already has a good title
      if (
        session.title &&
        session.title !== 'New Chat' &&
        !session.title.match(/^[A-Z]+\d*\s+Discussion$/)
      ) {
        console.log(`${progress} ⏭️  Skipped "${session.title}"`);
        skippedCount++;
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
          console.log(`${progress} ⏭️  No messages (${session.sessionId})`);
          skippedCount++;
          continue;
        }

        // Extract user messages
        const userMessages = messages
          .filter((msg: any) => msg.role === 'user')
          .map((msg: any) => msg.content)
          .join(' ');

        if (!userMessages.trim()) {
          console.log(`${progress} ⏭️  No user messages (${session.sessionId})`);
          skippedCount++;
          continue;
        }

        // Generate title
        let title = '';
        try {
          title = await ragService.generateChatTitle(
            userMessages,
            session.moduleCode || session.moduleId
          );
          console.log(`${progress} ✨ RAG title: "${title}"`);
        } catch (ragErr) {
          title = await generateLocalTitle(
            userMessages,
            session.moduleCode || session.moduleId
          );
          console.log(`${progress} 📝 Local title: "${title}"`);
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
      } catch (error) {
        console.log(`${progress} ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`
✅ Migration Complete!
━━━━━━━━━━━━━━━━━━━━━━━━
  Total chats:    ${allSessions.length}
  Updated:        ${updatedCount}
  Skipped:        ${skippedCount}
  Success rate:   ${Math.round((updatedCount / allSessions.length) * 100)}%
━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateChatTitles()
  .then(() => {
    console.log('✨ All done!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
