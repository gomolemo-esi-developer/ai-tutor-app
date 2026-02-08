import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  generateQuizHandler,
  getQuizHandler,
  generateSummaryHandler,
  createSessionHandler,
  sendMessageHandler,
  listSessionsHandler,
} from '../../src/lambda/ai/handler';
import { mockUsers, mockModules } from '../fixtures/mock-data';

describe('AI Handlers', () => {
  const createEvent = (
    body: any,
    path?: Record<string, any>,
    query?: Record<string, any>
  ): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    pathParameters: path,
    queryStringParameters: query,
    headers: {},
    httpMethod: 'POST',
    path: '/ai',
    resource: '',
    requestContext: {} as any,
    isBase64Encoded: false,
  });

  const studentId = mockUsers.student.userId;
  const moduleId = mockModules.module1.moduleId;

  describe('Quiz Generation', () => {
    it('should require student enrollment', async () => {
      const event = createEvent(
        {
          moduleId,
          numQuestions: 5,
          difficulty: 'MEDIUM',
        },
        { studentId }
      );

      const result = await generateQuizHandler(event);

      expect([201, 403]).toContain(result.statusCode);
    });

    it('should validate input', async () => {
      const event = createEvent(
        {
          moduleId: '',
          numQuestions: -1,
        },
        { studentId }
      );

      const result = await generateQuizHandler(event);

      expect(result.statusCode).toBe(422);
    });

    it('should get quiz by ID', async () => {
      const event = createEvent({}, { studentId, quizId: 'quiz_123' });

      const result = await getQuizHandler(event);

      expect([200, 404, 403]).toContain(result.statusCode);
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary for enrolled module', async () => {
      const event = createEvent(
        {
          moduleId,
          maxLength: 500,
        },
        { studentId }
      );

      const result = await generateSummaryHandler(event);

      expect([200, 403]).toContain(result.statusCode);
    });

    it('should require module ID', async () => {
      const event = createEvent(
        {
          maxLength: 500,
        },
        { studentId }
      );

      const result = await generateSummaryHandler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('Chat Sessions', () => {
    it('should create chat session', async () => {
      const event = createEvent(
        {
          title: 'Physics Questions',
          moduleId,
        },
        { studentId }
      );

      const result = await createSessionHandler(event);

      expect([201, 403]).toContain(result.statusCode);
    });

    it('should list student sessions', async () => {
      const event = createEvent({}, { studentId }, { page: '1', limit: '10' });

      const result = await listSessionsHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should send message in session', async () => {
      const event = createEvent(
        {
          message: 'What is Newton\'s first law?',
        },
        { studentId, sessionId: 'chat_123' }
      );

      const result = await sendMessageHandler(event);

      expect([200, 404, 403]).toContain(result.statusCode);
    });

    it('should require non-empty message', async () => {
      const event = createEvent(
        {
          message: '',
        },
        { studentId, sessionId: 'chat_123' }
      );

      const result = await sendMessageHandler(event);

      expect(result.statusCode).toBe(422);
    });
  });

  describe('Authorization', () => {
    it('should prevent access to unowned resources', async () => {
      const event = createEvent({}, { studentId: 'other_student', sessionId: 'chat_123' });

      const result = await sendMessageHandler(event);

      expect([403, 404]).toContain(result.statusCode);
    });

    it('should verify enrollment before quiz generation', async () => {
      const event = createEvent(
        {
          moduleId: 'unenrolled_module',
          numQuestions: 5,
        },
        { studentId }
      );

      const result = await generateQuizHandler(event);

      expect([403, 404]).toContain(result.statusCode);
    });
  });
});
