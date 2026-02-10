import nodemailer from 'nodemailer'
import { logger } from '@/utils/logger'
import { env } from '@/config/env'

// Development mode OTP for testing
const DEV_OTP = '1234'
const IS_DEV = env.NODE_ENV === 'development'

export class OtpService {
  private static mailer = (() => {
    if (env.SMTP_USER && env.SMTP_PASSWORD) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      })
    }
    return null
  })()

  /**
   * Generate a 4-digit OTP
   * In development without SMTP, returns DEV_OTP for testing
   */
  static generateOtp(): string {
    if (IS_DEV && !this.mailer) {
      logger.info('🔧 Development mode (no SMTP): Using mock OTP 1234')
      return DEV_OTP
    }
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  /**
   * Send OTP via email
   * In development, just logs the OTP instead of actually sending
   */
  static async sendEmailOtp(email: string, otp: string): Promise<boolean> {
    try {
      // If SMTP is configured, always send real email
      if (this.mailer) {
        await this.mailer.sendMail({
          from: env.SMTP_FROM || env.SMTP_USER,
          to: email,
          subject: '🔐 Your VerifyDev OTP Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #8b5cf6; margin: 0;">VerifyDev</h1>
              </div>
              
              <div style="background: #f5f5f5; padding: 30px; border-radius: 10px; text-align: center;">
                <h2 style="color: #333; margin-top: 0;">Your OTP Code</h2>
                <p style="color: #666; font-size: 14px; margin: 20px 0;">
                  Use this code to verify your email. Valid for 10 minutes.
                </p>
                
                <div style="background: #fff; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="font-size: 36px; font-weight: bold; color: #8b5cf6; letter-spacing: 8px; margin: 0;">
                    ${otp}
                  </p>
                </div>
                
                <p style="color: #999; font-size: 12px; margin: 20px 0;">
                  If you didn't request this, please ignore this email.
                </p>
              </div>
            </div>
          `,
        })
        logger.info({ email }, 'OTP sent via email')
        return true
      }

      // No SMTP configured — fallback to logging in dev mode
      if (IS_DEV) {
        logger.info({ email, otp }, '📧 DEV MODE: OTP (no SMTP configured)')
        console.log(`\n🔐 DEV OTP for ${email}: ${otp}\n`)
        return true
      }

      logger.error('SMTP not configured — cannot send OTP')
      return false
    } catch (error) {
      logger.error({ error, email }, 'Failed to send email OTP')
      return false
    }
  }

  /**
   * Send OTP via SMS (using Twilio)
   */
  static async sendSmsOtp(phone: string, _otp: string): Promise<boolean> {
    try {
      // This requires Twilio setup
      // const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
      // await client.messages.create({
      //   body: `Your VerifyDev OTP is: ${_otp}. Valid for 10 minutes.`,
      //   from: env.TWILIO_PHONE_NUMBER,
      //   to: phone,
      // })

      logger.info({ phone }, 'OTP sent via SMS (placeholder - Twilio not configured)')
      return true
    } catch (error) {
      logger.error({ error, phone }, 'Failed to send SMS OTP')
      return false
    }
  }

  /**
   * Validate OTP format
   */
  static isValidOtp(otp: string): boolean {
    return /^\d{4}$/.test(otp)
  }

  /**
   * Check if OTP has expired
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt
  }

  /**
   * Get OTP expiry time (10 minutes from now)
   */
  static getExpiryTime(): Date {
    const now = new Date()
    return new Date(now.getTime() + 10 * 60 * 1000)
  }
}
