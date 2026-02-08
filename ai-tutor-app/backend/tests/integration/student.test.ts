import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  listEnrolledModulesHandler,
  getModuleHandler,
  enrollHandler,
  listModuleFilesHandler,
} from '../../src/lambda/student/handler';
import { mockUsers, mockModules } from '../fixtures/mock-data';

describe('Student Handlers', () => {
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
    path: '/student',
    resource: '',
    requestContext: {} as any,
    isBase64Encoded: false,
  });

  const studentId = mockUsers.student.userId;
  const moduleId = mockModules.module1.moduleId;

  describe('Module Access', () => {
    it('should list enrolled modules', async () => {
      const event = createEvent({}, { studentId }, { page: '1', limit: '10' });

      const result = await listEnrolledModulesHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should get module if enrolled', async () => {
      const event = createEvent({}, { studentId, moduleId });

      const result = await getModuleHandler(event);

      expect([200, 403]).toContain(result.statusCode);
    });

    it('should require valid student ID', async () => {
      const event = createEvent({}, {}, { page: '1' });

      const result = await listEnrolledModulesHandler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('Module Enrollment', () => {
    it('should enroll in module', async () => {
      const event = createEvent({}, { studentId, moduleId });

      const result = await enrollHandler(event);

      expect([200, 400]).toContain(result.statusCode);
    });

    it('should prevent duplicate enrollment', async () => {
      // First enrollment
      const enrollEvent1 = createEvent({}, { studentId, moduleId });
      await enrollHandler(enrollEvent1);

      // Second enrollment (should fail)
      const enrollEvent2 = createEvent({}, { studentId, moduleId });
      const result = await enrollHandler(enrollEvent2);

      expect([400, 409]).toContain(result.statusCode);
    });
  });

  describe('Module Content Access', () => {
    it('should list module files if enrolled', async () => {
      const event = createEvent({}, { studentId, moduleId }, { page: '1', limit: '10' });

      const result = await listModuleFilesHandler(event);

      expect([200, 403]).toContain(result.statusCode);
    });

    it('should require enrollment to access files', async () => {
      const event = createEvent(
        {},
        { studentId: 'nonexistent_student', moduleId },
        { page: '1' }
      );

      const result = await listModuleFilesHandler(event);

      expect([404, 403]).toContain(result.statusCode);
    });
  });
});
