import { EnvConfig } from './environment';

/**
 * Cognito configuration
 */
export class CognitoConfig {
  static getUserPoolId(): string {
    return EnvConfig.get('COGNITO_USER_POOL_ID');
  }

  static getClientId(): string {
    return EnvConfig.get('COGNITO_CLIENT_ID');
  }

  static getRegion(): string {
    return EnvConfig.get('COGNITO_REGION');
  }

  /**
   * Password policy configuration
   */
  static getPasswordPolicy() {
    return {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      allowedSymbols: '!@#$%^&*-_.',
    };
  }

  /**
   * MFA configuration
   */
  static getMFAConfig() {
    return {
      enabled: false, // Optional MFA
      defaultDelivery: 'SMS',
    };
  }

  /**
   * Email verification
   */
  static getEmailVerificationConfig() {
    return {
      enabled: true,
      expirationDays: 1,
      template: 'email_verification',
    };
  }

  /**
   * Session configuration
   */
  static getSessionConfig() {
    return {
      accessTokenExpiry: 3600, // 1 hour
      refreshTokenExpiry: 604800, // 7 days
      idTokenExpiry: 3600, // 1 hour
    };
  }

  /**
   * Custom user attributes
   */
  static getCustomAttributes() {
    return {
      role: {
        type: 'String',
        mutable: true,
        values: ['ADMIN', 'EDUCATOR', 'STUDENT'],
      },
      department: {
        type: 'String',
        mutable: true,
      },
      enrollmentNumber: {
        type: 'String',
        mutable: false,
      },
    };
  }

  /**
   * Username/email authentication
   */
  static getAuthenticationConfig() {
    return {
      usernameAttributes: ['email'],
      caseSensitive: false,
    };
  }

  /**
   * Account lockout policy
   */
  static getAccountLockoutPolicy() {
    return {
      maxFailedLoginAttempts: 5,
      lockoutDuration: 900, // 15 minutes in seconds
    };
  }

  /**
   * Generate Cognito user pool config object
   */
  static getPoolConfig() {
    return {
      UserPoolId: this.getUserPoolId(),
      ClientId: this.getClientId(),
      Region: this.getRegion(),
    };
  }
}
