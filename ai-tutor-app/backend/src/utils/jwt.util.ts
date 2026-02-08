import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'EDUCATOR' | 'STUDENT';
  iat?: number;
  exp?: number;
}

export class JwtUtil {
  private static readonly ACCESS_TOKEN_EXPIRY = '1h';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Generate an access token (1 hour expiry)
   */
  static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_SECRET || 'dev-secret-key';
    return jwt.sign(payload, secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate a refresh token (7 days expiry)
   */
  static generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_SECRET || 'dev-secret-key';
    return jwt.sign(payload, secret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): TokenPayload {
    const secret = process.env.JWT_SECRET || 'dev-secret-key';
    try {
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (use with caution)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp * 1000 < Date.now();
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    return parts[1];
  }
}
