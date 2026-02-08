/**
 * AI Lambda Handler - Exports all AI endpoints
 * Handles: quiz generation, summarization, chat
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
} from './chat';
