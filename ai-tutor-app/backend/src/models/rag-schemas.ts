/**
 * RAG Service Response Schemas
 * Runtime validation for RAG API responses using Zod
 * 
 * Purpose: Prevent silent failures when RAG service changes response format
 * All RAG responses are validated against these schemas before use
 */

import { z } from 'zod';

/**
 * Chat response schema
 * Validates: POST /student/chat response
 */
export const RAGChatResponseSchema = z.object({
  success: z.boolean().describe('Whether the request was successful'),
  answer: z.string().min(1, 'Answer cannot be empty').describe('The AI-generated answer'),
  document_ids_used: z.array(z.string()).describe('IDs of documents used for context'),
  chunks_used: z.number().int().nonnegative().describe('Number of chunks retrieved'),
  response_time: z.number().positive().describe('Response time in seconds'),
  used_course_materials: z.boolean().describe('Whether course materials were used')
}).strict().describe('RAG chat response format');

export type RAGChatResponse = z.infer<typeof RAGChatResponseSchema>;

/**
 * Upload response schema
 * Validates: POST /educator/upload response (final message in stream)
 */
export const RAGUploadResponseSchema = z.object({
  status: z.enum(['complete', 'error']).describe('Processing status'),
  document_id: z.string().min(1).describe('Unique document ID from RAG'),
  filename: z.string().describe('Original filename'),
  chunks: z.number().int().positive().describe('Number of chunks created'),
  text_length: z.number().int().nonnegative().describe('Total characters extracted'),
  file_type: z.string().describe('Detected file type'),
  message: z.string().optional().describe('Optional status message')
}).strict().describe('RAG upload response format');

export type RAGUploadResponse = z.infer<typeof RAGUploadResponseSchema>;

/**
 * Quiz question schema
 */
export const RAGQuizQuestionSchema = z.object({
  type: z.enum(['multiple-choice', 'true-false']).describe('Question type'),
  question: z.string().min(1).describe('The question text'),
  options: z.array(z.string()).describe('Answer options'),
  correctAnswer: z.string().describe('The correct answer'),
  explanation: z.string().describe('Explanation for the answer'),
  points: z.number().positive().describe('Points for this question')
}).strict().describe('RAG quiz question format');

export type RAGQuizQuestion = z.infer<typeof RAGQuizQuestionSchema>;

/**
 * Quiz response schema
 * Validates: POST /quiz/generate response
 */
export const RAGQuizResponseSchema = z.object({
  quiz: z.object({
    id: z.string().describe('Unique quiz ID'),
    title: z.string().describe('Quiz title'),
    moduleId: z.string().describe('Module ID'),
    contentId: z.string().describe('Content/file ID'),
    questions: z.array(RAGQuizQuestionSchema).describe('List of questions')
  }).strict().describe('Quiz object structure')
}).strict().describe('RAG quiz generation response format');

export type RAGQuizResponse = z.infer<typeof RAGQuizResponseSchema>;

/**
 * Error response schema
 */
export const RAGErrorResponseSchema = z.object({
  status: z.enum(['error']).describe('Error status'),
  message: z.string().describe('Error message'),
  detail: z.any().optional().describe('Optional error details')
}).strict().describe('RAG error response format');

export type RAGErrorResponse = z.infer<typeof RAGErrorResponseSchema>;
