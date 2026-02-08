/**
 * QuizService - Real Backend Integration
 * Handles AI quiz generation and submission
 * 
 * Endpoints:
 * - POST /api/quiz/generate - Generate quiz from selected content
 * - GET /api/quiz/{quizId} - Get quiz details
 * - POST /api/quiz/{quizId}/submit - Submit quiz answers
 */

import { apiClient } from '@/lib/api';

export interface QuizQuestion {
  questionId: string;
  question: string;
  type: 'multiple_choice' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export interface Quiz {
  quizId: string;
  moduleId: string;
  contentIds?: string[];
  title: string;
  description: string;
  questions: QuizQuestion[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface QuizSubmission {
  quizId: string;
  answers: Record<string, string>; // questionId -> answer
  submittedAt: number;
}

export const QuizService = {
  /**
   * Generate a quiz from selected content
   * POST /api/quiz/generate
   */
  async generateQuiz(data: {
    moduleId: string;
    contentIds?: string[];
    title?: string;
    description?: string;
    numberOfQuestions?: number;
  }): Promise<Quiz> {
    try {
      return await apiClient.post('/api/quiz/generate', data, { timeout: 60000 });
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      throw error;
    }
  },

  /**
   * Get quiz details
   * GET /api/quiz/{quizId}
   */
  async getQuiz(quizId: string): Promise<Quiz> {
    try {
      return await apiClient.get(`/api/quiz/${quizId}`);
    } catch (error) {
      console.error(`Failed to fetch quiz ${quizId}:`, error);
      throw error;
    }
  },

  /**
   * Submit quiz answers
   * POST /api/quiz/{quizId}/submit
   */
  async submitQuiz(
    quizId: string,
    answers: Record<string, string>
  ): Promise<{ quizId: string; score: number; totalPoints: number; answers: Record<string, any> }> {
    try {
      return await apiClient.post(`/api/quiz/${quizId}/submit`, {
        answers,
      });
    } catch (error) {
      console.error(`Failed to submit quiz ${quizId}:`, error);
      throw error;
    }
  },
};

export default QuizService;
