import { ZodSchema, ZodError } from 'zod';
import { ValidationError, BadRequestError, NotFoundError } from '../utils/error.util';
import { LoggerUtil } from '../utils/logger.util';
import { DynamoDBService } from './dynamodb.service';
import { DatabaseConfig } from '../config/database.config';
import { Lecturer, Student } from '../models/types';

/**
 * Validation service for input data
 */
export class ValidationService {
  /**
   * Validate data against a Zod schema
   */
  static validate<T>(data: unknown, schema: ZodSchema): T {
    try {
      return schema.parse(data) as T;
    } catch (error) {
      if (error instanceof ZodError) {
        const details = this.formatZodErrors(error);
        throw new ValidationError('Validation failed', details);
      }
      throw error;
    }
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeParse<T>(data: unknown, schema: ZodSchema): { success: boolean; data?: T; errors?: Record<string, string[]> } {
    try {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data as T };
      }
      const errors = this.formatZodErrors(result.error);
      return { success: false, errors };
    } catch (error) {
      LoggerUtil.error('Validation error', error as Error);
      return { success: false, errors: { general: ['Validation error'] } };
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }
    if (!/[!@#$%^&*\-_.]/.test(password)) {
      errors.push('Password must contain special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize HTML (prevent XSS)
   */
  static sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate file type
   */
  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate file size
   */
  static validateFileSize(fileSize: number, maxSizeBytes: number): boolean {
    return fileSize <= maxSizeBytes;
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate URL
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format Zod errors into a readable object
   */
  private static formatZodErrors(error: ZodError): Record<string, string[]> {
    const details: Record<string, string[]> = {};

    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(err.message);
    });

    return details;
  }

  /**
   * Look up pre-created Lecturer record by staffNumber (Phase 3B)
   */
  static async lookupLecturerByStaffNumber(staffNumber: string): Promise<Lecturer | null> {
    try {
      const tables = DatabaseConfig.getTables();
      
      const result = await DynamoDBService.scan(tables.LECTURERS, {
        filterExpression: 'staffNumber = :num',
        expressionAttributeValues: {
          ':num': staffNumber,
        },
      });

      if (result.items && result.items.length > 0) {
        return result.items[0] as Lecturer;
      }
      return null;
    } catch (error) {
      LoggerUtil.error('Failed to lookup lecturer', error as Error);
      throw new BadRequestError('Failed to validate staff number');
    }
  }

  /**
   * Look up pre-created Student record by studentNumber (Phase 3B)
   */
  static async lookupStudentByStudentNumber(studentNumber: string): Promise<Student | null> {
    try {
      const tables = DatabaseConfig.getTables();
      
      const result = await DynamoDBService.scan(tables.STUDENTS, {
        filterExpression: 'studentNumber = :num',
        expressionAttributeValues: {
          ':num': studentNumber,
        },
      });

      if (result.items && result.items.length > 0) {
        return result.items[0] as Student;
      }
      return null;
    } catch (error) {
      LoggerUtil.error('Failed to lookup student', error as Error);
      throw new BadRequestError('Failed to validate student number');
    }
  }

  /**
   * Verify activation eligibility
   */
  static async verifyActivationEligibility(
    role: 'EDUCATOR' | 'STUDENT',
    staffOrStudentNumber: string
  ): Promise<{ eligible: boolean; record?: Lecturer | Student; error?: string }> {
    try {
      if (role === 'EDUCATOR') {
        const lecturer = await this.lookupLecturerByStaffNumber(staffOrStudentNumber);
        if (!lecturer) {
          return { eligible: false, error: 'Staff number not found' };
        }
        // Check registrationStatus instead of userId presence
        if (lecturer.registrationStatus !== 'PENDING') {
          return { eligible: false, error: 'This staff record has already been activated' };
        }
        return { eligible: true, record: lecturer };
      } else if (role === 'STUDENT') {
        const student = await this.lookupStudentByStudentNumber(staffOrStudentNumber);
        if (!student) {
          return { eligible: false, error: 'Student number not found' };
        }
        // Check registrationStatus instead of userId presence
        if (student.registrationStatus !== 'PENDING') {
          return { eligible: false, error: 'This student record has already been activated' };
        }
        return { eligible: true, record: student };
      }

      return { eligible: false, error: 'Invalid role for activation' };
    } catch (error) {
      LoggerUtil.error('Activation eligibility check failed', error as Error);
      return { eligible: false, error: 'Failed to verify activation eligibility' };
    }
  }
}
