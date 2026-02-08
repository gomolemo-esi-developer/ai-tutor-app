import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class CryptoUtil {
  private static readonly BCRYPT_ROUNDS = 10;
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  static hmacSha256(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Generate random token for password reset, email verification, etc.
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a token (for storage)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Encrypt data (returns IV:encrypted format)
   */
  static encrypt(data: string, encryptionKey?: string): string {
    const key = this.getEncryptionKey(encryptionKey);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data (from IV:encrypted format)
   */
  static decrypt(encrypted: string, encryptionKey?: string): string {
    const key = this.getEncryptionKey(encryptionKey);
    const [iv, data] = encrypted.split(':');

    const decipher = crypto.createDecipheriv(
      this.ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    let decrypted = decipher.update(data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }

  /**
   * Get encryption key from environment or generate one
   */
  private static getEncryptionKey(key?: string): Buffer {
    const keyString = key || process.env.ENCRYPTION_KEY || 'default-dev-key-32-chars-long!!!';
    // Ensure key is exactly 32 bytes for AES-256
    const hash = crypto.createHash('sha256').update(keyString).digest();
    return hash;
  }
}
