/**
 * SummaryService - Real Backend Integration
 * Handles AI content summarization
 * 
 * Endpoints:
 * - POST /api/summary/generate - Generate summary from selected content
 */

import { apiClient } from '@/lib/api';

export interface Summary {
  summaryId: string;
  moduleId: string;
  studentId?: string;
  contentIds: string[];
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const SummaryService = {
  /**
   * Generate a summary from selected content
   * POST /api/summary/generate
   */
  async generateSummary(data: {
    moduleId: string;
    contentIds: string[];
    title?: string;
    targetLength?: 'short' | 'medium' | 'long'; // 100, 300, 500+ words
  }): Promise<Summary> {
    try {
      return await apiClient.post('/api/summary/generate', data);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      throw error;
    }
  },
};

export default SummaryService;
