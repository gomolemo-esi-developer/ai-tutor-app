import { DynamoDBService } from './dynamodb.service';
import { DatabaseConfig } from '../config/database.config';
import { BadRequestError, UnauthorizedError } from '../utils/error.util';
import { LoggerUtil } from '../utils/logger.util';

/**
 * Verification Service - Manages verification codes for email and password reset
 * Uses a DynamoDB table to store temporary codes
 */
export class VerificationService {
  private static getTable(): string {
    return DatabaseConfig.getTables().VERIFICATION_CODES;
  }

  /**
   * Store verification code (expires in 15 minutes)
   */
  static async storeVerificationCode(email: string, code: string): Promise<void> {
    try {
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      const record = {
        pk: `VERIFY#${email}`,
        sk: 'CODE',
        code,
        email,
        type: 'EMAIL_VERIFICATION',
        createdAt: Date.now(),
        expiresAt,
        attempts: 0,
      };

      // Use direct DynamoDB put for verification codes
       // This is a simplified approach - you should create a dedicated table
       await DynamoDBService.put(this.getTable(), record as any);

      LoggerUtil.info('Verification code stored', { email, expiresAt });
    } catch (error) {
      LoggerUtil.error('Failed to store verification code', error as Error);
      throw error;
    }
  }

  /**
   * Verify code and mark as used
   */
  static async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const record = await DynamoDBService.get(this.getTable() as any, {
        pk: `VERIFY#${email}`,
        sk: 'CODE',
      });

      if (!record) {
        throw new BadRequestError('No verification code found for this email');
      }

      // Check if expired
      if (record.expiresAt < Date.now()) {
        throw new BadRequestError('Verification code has expired');
      }

      // Check if code matches
      if (record.code !== code) {
        // Increment attempts
        record.attempts = (record.attempts || 0) + 1;
        if (record.attempts >= 5) {
          // Lock after 5 failed attempts
          throw new BadRequestError('Too many failed attempts. Request a new code.');
        }
        await DynamoDBService.put(this.getTable(), record);
        throw new BadRequestError('Invalid verification code');
      }

      // Code is valid - delete it
      await DynamoDBService.delete(this.getTable() as any, {
        pk: `VERIFY#${email}`,
        sk: 'CODE',
      });

      LoggerUtil.info('Verification code verified', { email });
      return true;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      LoggerUtil.error('Verification failed', error as Error);
      throw new UnauthorizedError('Verification failed');
    }
  }

  /**
   * Store password reset code (expires in 1 hour)
   */
  static async storeResetCode(email: string, code: string): Promise<void> {
    try {
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

      const record = {
        pk: `RESET#${email}`,
        sk: 'CODE',
        code,
        email,
        type: 'PASSWORD_RESET',
        createdAt: Date.now(),
        expiresAt,
        attempts: 0,
      };

      await DynamoDBService.put(this.getTable(), record as any);
      LoggerUtil.info('Reset code stored', { email, expiresAt });
    } catch (error) {
      LoggerUtil.error('Failed to store reset code', error as Error);
      throw error;
    }
  }

  /**
   * Verify reset code
   */
  static async verifyResetCode(email: string, code: string): Promise<boolean> {
    try {
      const record = await DynamoDBService.get(this.getTable() as any, {
        pk: `RESET#${email}`,
        sk: 'CODE',
      });

      if (!record) {
        throw new BadRequestError('No reset code found for this email');
      }

      // Check if expired
      if (record.expiresAt < Date.now()) {
        throw new BadRequestError('Reset code has expired');
      }

      // Check if code matches
      if (record.code !== code) {
        record.attempts = (record.attempts || 0) + 1;
        if (record.attempts >= 5) {
          throw new BadRequestError('Too many failed attempts. Request a new code.');
        }
        await DynamoDBService.put(this.getTable(), record);
        throw new BadRequestError('Invalid reset code');
      }

      // Code is valid - don't delete yet (keep for password reset flow)
      LoggerUtil.info('Reset code verified', { email });
      return true;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      LoggerUtil.error('Reset verification failed', error as Error);
      throw new UnauthorizedError('Reset verification failed');
    }
  }

  /**
   * Delete reset code after successful password reset
   */
  static async deleteResetCode(email: string): Promise<void> {
    try {
      await DynamoDBService.delete(this.getTable() as any, {
        pk: `RESET#${email}`,
        sk: 'CODE',
      });
      LoggerUtil.info('Reset code deleted', { email });
    } catch (error) {
      LoggerUtil.error('Failed to delete reset code', error as Error);
    }
  }
}
