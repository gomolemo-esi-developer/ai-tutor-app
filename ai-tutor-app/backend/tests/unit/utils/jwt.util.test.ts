import { JwtUtil } from '../../../src/utils/jwt.util';

describe('JwtUtil', () => {
  const testPayload = {
    userId: 'user_123',
    email: 'test@example.com',
    role: 'STUDENT' as const,
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = JwtUtil.generateAccessToken(testPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JwtUtil.generateRefreshToken(testPayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = JwtUtil.generateTokenPair(testPayload);
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = JwtUtil.generateAccessToken(testPayload);
      const decoded = JwtUtil.verifyToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => JwtUtil.verifyToken('invalid.token.here')).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = JwtUtil.generateAccessToken(testPayload);
      const decoded = JwtUtil.decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = JwtUtil.decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;

      const extracted = JwtUtil.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for missing Bearer prefix', () => {
      const extracted = JwtUtil.extractTokenFromHeader('test-token-123');
      expect(extracted).toBeNull();
    });

    it('should return null for missing header', () => {
      const extracted = JwtUtil.extractTokenFromHeader();
      expect(extracted).toBeNull();
    });
  });
});
