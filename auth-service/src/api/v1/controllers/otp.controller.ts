import { Request, Response } from 'express'
import { prisma } from '@/prisma/client'
import { OtpService } from '@/services/otp.service'
import { TokenService } from '@/services/token.service'
import { logger } from '@/utils/logger'

export class OtpController {
  /**
   * Request OTP for email-based signup/login
   * POST /v1/auth/otp/request-email
   */
  static async requestEmailOtp(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, type: rawType = 'login' } = req.body
      const type = rawType.toUpperCase()

      if (!email) {
        return res.status(400).json({ error: 'Email is required' })
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }

      // For signup, check if email already exists
      if (type === 'signup') {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })
        if (existingUser) {
          return res.status(400).json({ error: 'Email already registered' })
        }
      }

      // Generate OTP
      const otp = OtpService.generateOtp()
      const expiresAt = OtpService.getExpiryTime()

      // Delete any existing OTP for this email+type, then create new one
      await prisma.otpVerification.deleteMany({
        where: { email, type: type as any },
      })
      await prisma.otpVerification.create({
        data: {
          email,
          code: otp,
          type: type as any,
          expiresAt,
        },
      })

      // Send OTP via email
      const sent = await OtpService.sendEmailOtp(email, otp)
      if (!sent) {
        return res
          .status(500)
          .json({ error: 'Failed to send OTP. Please try again.' })
      }

      logger.info({ email, type }, 'OTP requested via email')
      res.json({
        message: 'OTP sent to your email',
        email: email.replace(/(.{2})(.*)(.{2}@.*)/, '$1***$3'),
      })
    } catch (error) {
      logger.error({ error }, 'OTP request error')
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Request OTP for phone-based verification (mobile)
   * POST /v1/auth/otp/request-phone
   */
  static async requestPhoneOtp(req: Request, res: Response): Promise<Response | void> {
    try {
      const { phone, type: rawType = 'mobile_verify' } = req.body
      const type = rawType.toUpperCase()

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' })
      }

      const phoneRegex = /^\+?[1-9]\d{1,14}$/
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number format' })
      }

      const otp = OtpService.generateOtp()
      const expiresAt = OtpService.getExpiryTime()

      // Delete any existing OTP for this phone+type, then create new one
      await prisma.otpVerification.deleteMany({
        where: { phone, type: type as any },
      })
      await prisma.otpVerification.create({
        data: {
          phone,
          code: otp,
          type: type as any,
          expiresAt,
        },
      })

      const sent = await OtpService.sendSmsOtp(phone, otp)
      if (!sent) {
        return res
          .status(500)
          .json({ error: 'Failed to send OTP. Please try again.' })
      }

      logger.info({ phone, type }, 'OTP requested via SMS')
      res.json({
        message: 'OTP sent to your phone',
        phone: phone.replace(/(.{2})(.*)(.{2})/, '$1***$3'),
      })
    } catch (error) {
      logger.error({ error }, 'Phone OTP request error')
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Verify OTP and authenticate/register user
   * POST /v1/auth/otp/verify
   */
  static async verifyOtp(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, phone, otp, type: rawType = 'login' } = req.body
      const type = rawType.toUpperCase()

      if (!otp) {
        return res.status(400).json({ error: 'OTP is required' })
      }

      if (!OtpService.isValidOtp(otp)) {
        return res.status(400).json({ error: 'Invalid OTP format' })
      }

      if (!email && !phone) {
        return res
          .status(400)
          .json({ error: 'Email or phone is required' })
      }

      // Find OTP record using findFirst instead of findUnique with compound key
      const otpRecord = await prisma.otpVerification.findFirst({
        where: email
          ? { email, type: type as any }
          : { phone, type: type as any },
      })

      if (!otpRecord) {
        return res.status(400).json({ error: 'OTP not found. Request a new one.' })
      }

      if (OtpService.isExpired(otpRecord.expiresAt)) {
        return res.status(400).json({ error: 'OTP expired. Request a new one.' })
      }

      if (otpRecord.isUsed) {
        return res.status(400).json({ error: 'OTP already used. Request a new one.' })
      }

      if (otpRecord.code !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' })
      }

      // Mark OTP as used
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      })

      // Find or create user
      let user = email
        ? await prisma.user.findUnique({
          where: { email },
        })
        : null

      if (!user && type === 'signup') {
        const username = email
          ? email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 9)
          : 'user_' + Math.random().toString(36).substr(2, 9)

        user = await prisma.user.create({
          data: {
            username,
            email: email || undefined,
          },
        })

        logger.info({ userId: user.id, email }, 'User created via OTP signup')
      } else if (!user && type === 'login') {
        return res.status(404).json({
          error: 'User not found. Please sign up first.',
        })
      }

      // Generate JWT tokens via TokenService
      const tokens = await TokenService.generateTokens(user!.id)

      logger.info({ userId: user!.id }, 'User authenticated via OTP')

      res.json({
        message: 'OTP verified successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user!.id,
          username: user!.username,
          email: user!.email,
        },
      })
    } catch (error) {
      logger.error({ error }, 'OTP verification error')
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Resend OTP
   * POST /v1/auth/otp/resend
   */
  static async resendOtp(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, phone, type: rawType = 'login' } = req.body
      const type = rawType.toUpperCase()

      if (!email && !phone) {
        return res
          .status(400)
          .json({ error: 'Email or phone is required' })
      }

      const otp = OtpService.generateOtp()
      const expiresAt = OtpService.getExpiryTime()

      if (email) {
        // Delete existing + create new
        await prisma.otpVerification.deleteMany({
          where: { email, type: type as any },
        })
        await prisma.otpVerification.create({
          data: {
            email,
            code: otp,
            type: type as any,
            expiresAt,
          },
        })
        await OtpService.sendEmailOtp(email, otp)
      } else {
        await prisma.otpVerification.deleteMany({
          where: { phone, type: type as any },
        })
        await prisma.otpVerification.create({
          data: {
            phone,
            code: otp,
            type: type as any,
            expiresAt,
          },
        })
        await OtpService.sendSmsOtp(phone, otp)
      }

      logger.info({ email, phone, type }, 'OTP resent')
      res.json({ message: 'OTP sent successfully' })
    } catch (error) {
      logger.error({ error }, 'OTP resend error')
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
