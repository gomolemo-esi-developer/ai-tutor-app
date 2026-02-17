/**
 * AI Lambda Handler - Exports all AI endpoints
 * Handles: quiz generation, summarization, chat, title generation
 */

export {
  handleGenerateQuiz as generateQuizHandler,
  handleGetQuiz as getQuizHandler,
  handleSubmitQuiz as submitQuizHandler,
} from './quiz';

export { handleGenerateSummary as generateSummaryHandler } from './summary';

export {
  handleCreateSession as createSessionHandler,
  handleGetSession as getSessionHandler,
  handleSendMessage as sendMessageHandler,
  handleListSessions as listSessionsHandler,
  handleGetMessages as getMessagesHandler,
  handleDeleteSession as deleteSessionHandler,
  handleGetFileMetadata as getFileMetadataHandler,
} from './chat';

export {
  handleGenerateTitleForChat as generateTitleHandler,
  handleBatchGenerateTitles as batchGenerateTitlesHandler,
} from './title-generator';
