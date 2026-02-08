import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export class UuidUtil {
  /**
   * Generate a new UUID v4
   */
  static generate(): string {
    return uuidv4();
  }

  /**
   * Validate if string is a valid UUID
   */
  static isValid(id: string): boolean {
    return validateUuid(id);
  }

  /**
   * Generate a prefixed ID for different resources
   */
  static generateWithPrefix(prefix: string): string {
    return `${prefix}_${uuidv4()}`;
  }

  /**
   * Generate user ID
   */
  static generateUserId(): string {
    return this.generateWithPrefix('user');
  }

  /**
   * Generate module ID
   */
  static generateModuleId(): string {
    return this.generateWithPrefix('module');
  }

  /**
   * Generate file ID
   */
  static generateFileId(): string {
    return this.generateWithPrefix('file');
  }

  /**
   * Generate chat session ID
   */
  static generateChatSessionId(): string {
    return this.generateWithPrefix('chat');
  }

  /**
   * Generate audit log ID
   */
  static generateAuditLogId(): string {
    return this.generateWithPrefix('audit');
  }
}
