/**
 * ChatService - Real Backend Integration
 * Handles AI chat sessions and messaging
 * 
 * Endpoints:
 * - POST /api/chat - Create new chat session
 * - GET /api/chat - List all sessions for student
 * - GET /api/chat/{sessionId} - Get session details
 * - POST /api/chat/{sessionId}/messages - Send message
 * - DELETE /api/chat/{sessionId} - Delete session
 */

import { apiClient } from '@/lib/api';

export interface ChatSession {
  sessionId: string;
  studentId: string;
  moduleId: string;
  contentIds?: string[];
  title: string;
  createdAt: number;
  updatedAt: number;
  ttl: number;
}

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export const ChatService = {
  /**
   * Create a new chat session
   * POST /api/chat
   */
  async createSession(data: {
    moduleId: string;
    title?: string;
    contentIds?: string[];
  }): Promise<ChatSession> {
    try {
      return await apiClient.post('/api/chat', data);
    } catch (error) {
      console.error('Failed to create chat session:', error);
      throw error;
    }
  },

  /**
   * List all chat sessions for the current student
   * GET /api/chat
   */
  async listSessions(): Promise<ChatSession[]> {
    try {
      return await apiClient.get('/api/chat');
    } catch (error) {
      console.error('Failed to list chat sessions:', error);
      throw error;
    }
  },

  /**
   * Get a specific chat session
   * GET /api/chat/{sessionId}
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    try {
      return await apiClient.get(`/api/chat/${sessionId}`);
    } catch (error) {
      console.error(`Failed to fetch chat session ${sessionId}:`, error);
      throw error;
    }
  },

  /**
   * Send a message in a chat session
   * POST /api/chat/{sessionId}/messages
   */
  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    try {
      return await apiClient.post(`/api/chat/${sessionId}/messages`, {
        content: message,
      });
    } catch (error) {
      console.error(`Failed to send message in session ${sessionId}:`, error);
      throw error;
    }
  },

  /**
   * Get all messages in a chat session
   * GET /api/chat/{sessionId}/messages (assumed endpoint)
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      return await apiClient.get(`/api/chat/${sessionId}/messages`);
    } catch (error) {
      console.error(`Failed to fetch messages for session ${sessionId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a chat session
   * DELETE /api/chat/{sessionId}
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/chat/${sessionId}`);
    } catch (error) {
      console.error(`Failed to delete chat session ${sessionId}:`, error);
      throw error;
    }
  },
};

export default ChatService;
