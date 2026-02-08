import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  listLecturersHandler,
  createLecturerHandler,
  getLecturerHandler,
  listStudentsHandler,
  createStudentHandler,
  getStudentHandler,
  listModulesHandler,
  createModuleHandler,
  getModuleHandler,
} from '../../src/lambda/admin/handler';
import { mockUsers, mockLecturers, mockModules } from '../fixtures/mock-data';

describe('Admin Handlers', () => {
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
    path: '/admin',
    resource: '',
    requestContext: {} as any,
    isBase64Encoded: false,
  });

  describe('Lecturer Operations', () => {
    it('should list lecturers', async () => {
      const event = createEvent({}, {}, { page: '1', limit: '10' });

      const result = await listLecturersHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it('should create lecturer', async () => {
      const event = createEvent({
        userId: mockUsers.educator.userId,
        department: 'Computer Science',
        qualifications: ['BSc', 'MSc'],
        specialization: 'AI',
      });

      const result = await createLecturerHandler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.lecturerId).toBeTruthy();
    });

    it('should get lecturer by ID', async () => {
      const event = createEvent({}, { id: mockLecturers.lecturer1.lecturerId });

      const result = await getLecturerHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent lecturer', async () => {
      const event = createEvent({}, { id: 'nonexistent_lecturer' });

      const result = await getLecturerHandler(event);

      expect(result.statusCode).toBe(404);
    });
  });

  describe('Student Operations', () => {
    it('should list students', async () => {
      const event = createEvent({}, {}, { page: '1', limit: '10' });

      const result = await listStudentsHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should create student', async () => {
      const event = createEvent({
        userId: mockUsers.student.userId,
        enrollmentNumber: 'STU-2024-00001',
        grade: '1st Year',
        major: 'Computer Science',
      });

      const result = await createStudentHandler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.studentId).toBeTruthy();
    });

    it('should get student by ID', async () => {
      const event = createEvent({}, { id: 'student_123' });

      const result = await getStudentHandler(event);

      expect([200, 404]).toContain(result.statusCode);
    });
  });

  describe('Module Operations', () => {
    it('should list modules', async () => {
      const event = createEvent({}, {}, { page: '1', limit: '10' });

      const result = await listModulesHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should create module', async () => {
      const event = createEvent({
        title: 'Advanced TypeScript',
        description: 'Learn advanced TypeScript concepts',
        code: 'CS401',
        lecturerId: mockLecturers.lecturer1.lecturerId,
      });

      const result = await createModuleHandler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.moduleId).toBeTruthy();
    });

    it('should get module by ID', async () => {
      const event = createEvent({}, { id: mockModules.module1.moduleId });

      const result = await getModuleHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });
});
