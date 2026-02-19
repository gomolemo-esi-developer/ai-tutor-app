import axios from 'axios';
import { EnvConfig } from '../config/environment';
import { LoggerUtil } from '../utils/logger.util';
import { InternalServerError, BadRequestError } from '../utils/error.util';

/**
 * AI service for Claude/OpenAI integration
 * Note: API clients are instantiated on demand, not duplicated
 */
export class AIService {
  private static apiProvider = EnvConfig.get('AI_API_PROVIDER');
  private static apiKey = EnvConfig.get('AI_API_KEY');

  /**
   * Validate AI configuration
   */
  private static validateConfig(): void {
    if (!this.apiProvider) {
      throw new BadRequestError('AI_API_PROVIDER environment variable not configured');
    }
    if (!this.apiKey) {
      throw new BadRequestError('AI_API_KEY environment variable not configured. Please set your Claude or OpenAI API key.');
    }
  }

  /**
   * Generate a quiz from module content
   */
  static async generateQuiz(
    moduleContent: string,
    numQuestions: number = 5,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'
  ): Promise<any> {
    try {
      const prompt = this.buildQuizPrompt(moduleContent, numQuestions, difficulty);

      const response = await this.callAI(prompt);

      LoggerUtil.info('Quiz generated', { numQuestions, difficulty });

      return this.parseQuizResponse(response);
    } catch (error) {
      LoggerUtil.error('Quiz generation failed', error as Error);
      throw new InternalServerError('Failed to generate quiz');
    }
  }

  /**
   * Generate a summary from module content
   */
  static async generateSummary(moduleContent: string, maxLength: number = 500): Promise<string> {
    try {
      const prompt = this.buildSummaryPrompt(moduleContent, maxLength);

      const summary = await this.callAI(prompt);

      LoggerUtil.info('Summary generated', { contentLength: moduleContent.length });

      return summary;
    } catch (error) {
      LoggerUtil.error('Summary generation failed', error as Error);
      throw new InternalServerError('Failed to generate summary');
    }
  }

  /**
   * Chat with context
   */
  static async chat(
    userMessage: string,
    context: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    // If API key not configured, return stub response (AI ready but not blocking)
    if (!this.apiKey) {
      const stub = `I received your message: "${userMessage.substring(0, 50)}...". ` +
        (context ? `This relates to: ${context.substring(0, 50)}...` : '') +
        ` [Configure AI_API_KEY to enable real AI responses]`;
      LoggerUtil.info('Chat response generated (stub - no API key configured)', { messageLength: userMessage.length });
      return stub;
    }

    try {
      const prompt = this.buildChatPrompt(userMessage, context, conversationHistory);

      const response = await this.callAI(prompt);

      LoggerUtil.info('Chat response generated', { messageLength: userMessage.length });

      return response;
    } catch (error) {
      LoggerUtil.error('Chat failed', error as Error);
      throw new InternalServerError('Failed to process chat message');
    }
  }

  /**
   * Call AI API (Claude or OpenAI)
   * Returns stub response if API key is not configured (graceful degradation)
   */
  private static async callAI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return '[Stub AI Response - API key not configured]';
    }

    if (this.apiProvider === 'claude') {
      return this.callClaude(prompt);
    } else if (this.apiProvider === 'openai') {
      return this.callOpenAI(prompt);
    } else {
      throw new BadRequestError(`Unknown AI provider: ${this.apiProvider}`);
    }
  }

  /**
   * Call Claude API
   */
  private static async callClaude(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        }
      );

      if (response.data.content && response.data.content.length > 0) {
        return response.data.content[0].text;
      }

      throw new Error('No content in Claude response');
    } catch (error) {
      LoggerUtil.error('Claude API call failed', error as Error);
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  private static async callOpenAI(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2048,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No content in OpenAI response');
    } catch (error) {
      LoggerUtil.error('OpenAI API call failed', error as Error);
      throw error;
    }
  }

  /**
   * Build quiz generation prompt
   */
  private static buildQuizPrompt(
    content: string,
    numQuestions: number,
    difficulty: string
  ): string {
    return `Based on the following content, generate ${numQuestions} multiple choice questions at ${difficulty} level.
Format the response as JSON with array of objects containing: question, options (array of 4 strings), correctAnswer (index 0-3).

Content:
${content}

Response must be valid JSON array.`;
  }

  /**
   * Build summary prompt
   */
  private static buildSummaryPrompt(content: string, maxLength: number): string {
    return `Summarize the following content in no more than ${maxLength} characters:

${content}

Provide only the summary, no additional text.`;
  }

  /**
   * Build chat prompt
   */
  private static buildChatPrompt(
    userMessage: string,
    context: string,
    history?: Array<{ role: string; content: string }>
  ): string {
    let prompt = `You are a helpful educational tutor. Here is the context for your response:

Context:
${context}

`;

    if (history && history.length > 0) {
      prompt += 'Previous conversation:\n';
      history.forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
    }

    prompt += `\nUser: ${userMessage}\nAssistant:`;

    return prompt;
  }

  /**
   * Parse quiz response from AI
   */
  private static parseQuizResponse(response: string): any {
    try {
      // Extract JSON from response (AI might add extra text)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const quiz = JSON.parse(jsonMatch[0]);

      return {
        questions: quiz.map((q: any) => ({
          questionId: `q_${Date.now()}_${Math.random()}`,
          question: q.question,
          type: 'multiple_choice',
          options: q.options,
          correctAnswer: q.options[q.correctAnswer],
          points: 1,
        })),
      };
    } catch (error) {
      LoggerUtil.error('Failed to parse quiz response', error as Error);
      throw new InternalServerError('Failed to parse quiz response');
    }
  }
}
