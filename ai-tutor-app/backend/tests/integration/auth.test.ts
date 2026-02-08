import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleGetUser,
  handleUpdateProfile,
  handleChangePassword,
} from '../../src/lambda/auth/handler';
import { mockUsers } from '../fixtures/mock-data';
import { JwtUtil } from '../../src/utils/jwt.util';

describe('Auth Handlers', () => {
  const createEvent = (body: any, path?: Record<string, any>): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    pathParameters: path,
    queryStringParameters: null,
    headers: {},
    httpMethod: 'POST',
    path: '/auth',
    resource: '',
    requestContext: {} as any,
    isBase64Encoded: false,
  });

  describe('handleRegister', () => {
    it('should register a new user', async () => {
      const event = createEvent({
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
      });

      const result = await handleRegister(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('newuser@example.com');
    });

    it('should reject invalid email', async () => {
      const event = createEvent({
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
      });

      const result = await handleRegister(event);

      expect(result.statusCode).toBe(422);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const event = createEvent({
        email: 'user@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
      });

      const result = await handleRegister(event);

      expect(result.statusCode).toBe(422);
    });
  });

  describe('handleLogin', () => {
    it('should authenticate valid user', async () => {
      // First register
      const registerEvent = createEvent({
        email: 'login@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
      });

      await handleRegister(registerEvent);

      // Then login
      const loginEvent = createEvent({
        email: 'login@example.com',
        password: 'Password123!',
      });

      const result = await handleLogin(loginEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.refreshToken).toBeTruthy();
    });

    it('should reject invalid credentials', async () => {
      const event = createEvent({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });

      const result = await handleLogin(event);

      expect(result.statusCode).toBe(401);
    });
  });

  describe('handleRefresh', () => {
    it('should refresh valid token', async () => {
      const refreshToken = JwtUtil.generateRefreshToken({
        userId: 'user_123',
        email: 'test@example.com',
        role: 'STUDENT',
      });

      const event = createEvent({
        refreshToken,
      });

      const result = await handleRefresh(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeTruthy();
    });

    it('should reject invalid token', async () => {
      const event = createEvent({
        refreshToken: 'invalid.token.here',
      });

      const result = await handleRefresh(event);

      expect(result.statusCode).toBe(401);
    });
  });

  describe('handleGetUser', () => {
    it('should get user profile', async () => {
      const event = createEvent({}, { userId: mockUsers.student.userId });

      const result = await handleGetUser(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBeTruthy();
    });

    it('should return 404 for non-existent user', async () => {
      const event = createEvent({}, { userId: 'nonexistent_user' });

      const result = await handleGetUser(event);

      expect(result.statusCode).toBe(404);
    });
  });

  describe('handleUpdateProfile', () => {
    it('should update user profile', async () => {
      const event = createEvent(
        {
          firstName: 'Jane',
          bio: 'New bio',
        },
        { userId: mockUsers.student.userId }
      );

      const result = await handleUpdateProfile(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });

  describe('handleChangePassword', () => {
    it('should change password with valid current password', async () => {
      const event = createEvent(
        {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        },
        { userId: mockUsers.student.userId }
      );

      const result = await handleChangePassword(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });
});
