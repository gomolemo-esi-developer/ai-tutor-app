import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EnvConfig } from '../config/environment';
import { LoggerUtil } from '../utils/logger.util';
import { InternalServerError } from '../utils/error.util';
import { CryptoUtil } from '../utils/crypto.util';

/**
 * Email Service - Sends verification codes via AWS SES
 * Uses cryptographically signed codes that don't require database storage
 */
export class EmailService {
  private static sesClient = new SESClient({ region: EnvConfig.get('AWS_REGION') });
  private static senderEmail = process.env.SES_SENDER_EMAIL || 'sibiyag@tut.ac.za';

  /**
   * Generate 6-digit verification PIN
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification link email (Cognito-based)
   */
  static async sendVerificationLinkEmail(
    recipientEmail: string,
    firstName: string = 'User',
    verificationLink: string = ''
  ): Promise<void> {
    // In development, log link to console for testing
    if (process.env.NODE_ENV === 'development') {
      LoggerUtil.info('📧 VERIFICATION LINK (DEV MODE)', {
        email: recipientEmail,
        link: verificationLink || 'No link provided - user can call verify-email endpoint',
      });
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 5px; }
              .content { padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; margin-top: 20px; }
              .button-container { text-align: center; margin: 20px 0; }
              .button { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>TutorVerse</h1>
                <p>Email Verification</p>
              </div>
              <div class="content">
                <p>Hello ${firstName},</p>
                <p>Thank you for registering with TutorVerse. Please verify your email address to complete your account setup.</p>
                <p>Click the button below to verify your email:</p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${verificationLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
                </div>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #0066cc; text-decoration: underline;"><a href="${verificationLink}" style="color: #0066cc;">${verificationLink}</a></p>
                <p>This link will expire in 24 hours. If you did not request this verification, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 TutorVerse. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const plainTextContent = `
Hello ${firstName},

Thank you for registering with TutorVerse. Please verify your email address to complete your account setup.

Click the link below to verify your email:

${verificationLink}

If the link doesn't work, copy and paste the URL above into your browser.

This link will expire in 24 hours. If you did not request this verification, please ignore this email.

© 2026 TutorVerse. All rights reserved.
      `;

      const command = new SendEmailCommand({
        Source: this.senderEmail,
        Destination: {
          ToAddresses: [recipientEmail],
        },
        Message: {
          Subject: {
            Data: 'TutorVerse - Verify Your Email',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
            Text: {
              Data: plainTextContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await this.sesClient.send(command);
      LoggerUtil.info('✅ Verification email sent via SES', {
        email: recipientEmail,
        messageId: response.MessageId,
      });
    } catch (error: any) {
      console.error('❌ SES ERROR DETAILS:', error);
      LoggerUtil.error('❌ Failed to send verification email via SES', {
        email: recipientEmail,
        errorMessage: error?.message || 'Unknown error',
        errorCode: error?.Code || error?.name,
        errorStack: error?.stack,
        sender: this.senderEmail,
      });
      
      // In development, don't fail - just log the code
      if (process.env.NODE_ENV === 'development') {
        LoggerUtil.warn('⚠️ Email sending failed in dev mode, but code is logged above');
        console.log('📧 Verify SES setup: AWS credentials, region, and sender email must be verified in AWS SES console');
        return;
      }
      
      throw new InternalServerError('Failed to send verification email');
    }
  }

  /**
   * Send verification code email (6-digit PIN)
   */
  static async sendVerificationCode(
    recipientEmail: string,
    code: string
  ): Promise<void> {
    // In development, log code to console for testing
    if (process.env.NODE_ENV === 'development') {
      LoggerUtil.info('📧 VERIFICATION CODE (DEV MODE)', {
        email: recipientEmail,
        code,
      });
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 5px; }
              .content { padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; margin-top: 20px; }
              .code-box { background-color: #fff; border: 2px solid #4f46e5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
              .code { font-size: 36px; font-weight: bold; color: #4f46e5; letter-spacing: 8px; }
              .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>TutorVerse</h1>
                <p>Email Verification</p>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering with TutorVerse. Please use the code below to verify your email address:</p>
                <div class="code-box">
                  <div class="code">${code}</div>
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p>If you did not request this verification, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 TutorVerse. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const plainTextContent = `
Hello,

Thank you for registering with TutorVerse. Please use the code below to verify your email address:

${code}

This code will expire in 15 minutes.

If you did not request this verification, please ignore this email.

© 2026 TutorVerse. All rights reserved.
      `;

      const command = new SendEmailCommand({
        Source: this.senderEmail,
        Destination: {
          ToAddresses: [recipientEmail],
        },
        Message: {
          Subject: {
            Data: 'TutorVerse - Verify Your Email',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
            Text: {
              Data: plainTextContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await this.sesClient.send(command);
      LoggerUtil.info('✅ Verification code email sent via SES', {
        email: recipientEmail,
        messageId: response.MessageId,
      });
    } catch (error: any) {
      console.error('❌ SES ERROR DETAILS:', error);
      LoggerUtil.error('❌ Failed to send verification code email via SES', {
        email: recipientEmail,
        errorMessage: error?.message || 'Unknown error',
        errorCode: error?.Code || error?.name,
      });
      
      // In development, don't fail - just log the code
      if (process.env.NODE_ENV === 'development') {
        LoggerUtil.warn('⚠️ Email sending failed in dev mode, but code is logged above');
        return;
      }
      
      throw new InternalServerError('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    recipientEmail: string,
    resetCode: string,
    firstName: string = 'User'
  ): Promise<void> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 5px; }
              .content { padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; margin-top: 20px; }
              .code-box { background-color: #fff; border: 2px solid #4f46e5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
              .code { font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 5px; }
              .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>TutorVerse</h1>
                <p>Password Reset</p>
              </div>
              <div class="content">
                <p>Hello ${firstName},</p>
                <p>We received a request to reset your password. Use the code below to reset your password:</p>
                <div class="code-box">
                  <div class="code">${resetCode}</div>
                </div>
                <p>This code will expire in 1 hour.</p>
                <p>If you did not request a password reset, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 TutorVerse. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const command = new SendEmailCommand({
        Source: this.senderEmail,
        Destination: {
          ToAddresses: [recipientEmail],
        },
        Message: {
          Subject: {
            Data: 'TutorVerse - Password Reset Code',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await this.sesClient.send(command);
      LoggerUtil.info('✅ Password reset email sent via SES', { email: recipientEmail });
    } catch (error: any) {
      LoggerUtil.error('❌ Failed to send password reset email via SES', {
        email: recipientEmail,
        error: error.message,
      });
      
      // In development, don't fail - just log
      if (process.env.NODE_ENV === 'development') {
        LoggerUtil.warn('⚠️ Email sending failed in dev mode');
        return;
      }
      
      throw new InternalServerError('Failed to send password reset email');
    }
  }
}
