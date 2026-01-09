import { Request, Response } from 'express'
import { prisma } from '@/prisma/client'
import { OtpService } from '@/services/otp.service'
import { logger } from '@/utils/logger'

export class OtpController {
  /**
   * Request OTP for email-based signup/login
   * POST /v1/auth/otp/request-email
   */
  static async requestEmailOtp(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email, type = 'login' } = req.body

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

      // Store OTP in database (replace if already exists)
      await prisma.otpVerification.upsert({
        where: {
          email_type: {
            email,
            type: type as any,
          },
        },
        create: {
          email,
          code: otp,
          type: type as any,
          expiresAt,
        },
        update: {
          code: otp,
          expiresAt,
          isUsed: false,
          usedAt: null,
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
        email: email.replace(/(.{2})(.*)(.{2}@.*)/, '$1***$3'), // Hide partial email
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
      const { phone, type = 'mobile_verify' } = req.body

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' })
      }

      // Validate phone format (basic check)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number format' })
      }

      // Generate OTP
      const otp = OtpService.generateOtp()
      const expiresAt = OtpService.getExpiryTime()

      // Store OTP in database
      await prisma.otpVerification.upsert({
        where: {
          phone_type: {
            phone,
            type: type as any,
          },
        },
        create: {
          phone,
          code: otp,
          type: type as any,
          expiresAt,
        },
        update: {
          code: otp,
          expiresAt,
          isUsed: false,
          usedAt: null,
        },
      })

      // Send OTP via SMS
      const sent = await OtpService.sendSmsOtp(phone, otp)
      if (!sent) {
        return res
          .status(500)
          .json({ error: 'Failed to send OTP. Please try again.' })
      }

      logger.info({ phone, type }, 'OTP requested via SMS')
      res.json({
        message: 'OTP sent to your phone',
        phone: phone.replace(/(.{2})(.*)(.{2})/, '$1***$3'), // Hide partial phone
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
      const { email, phone, otp, type = 'login' } = req.body

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

      // Find OTP record
      const otpRecord = email
        ? await prisma.otpVerification.findUnique({
            where: {
              email_type: {
                email,
                type: type as any,
              },
            },
          })
        : await prisma.otpVerification.findUnique({
            where: {
              phone_type: {
                phone,
                type: type as any,
              },
            },
          })

      if (!otpRecord) {
        return res.status(400).json({ error: 'OTP not found. Request a new one.' })
      }

      // Check if OTP is expired
      if (OtpService.isExpired(otpRecord.expiresAt)) {
        return res.status(400).json({ error: 'OTP expired. Request a new one.' })
      }

      // Check if OTP is already used
      if (otpRecord.isUsed) {
        return res.status(400).json({ error: 'OTP already used. Request a new one.' })
      }

      // Verify OTP code
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
        // Create new user for signup
        const username = email
          ? email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 9)
          : 'user_' + Math.random().toString(36).substr(2, 9)

        user = await prisma.user.create({
          data: {
            username,
            email: email || undefined,
            githubId: '', // Will be empty for OTP-based signup
          },
        })

        logger.info({ userId: user.id, email }, 'User created via OTP signup')
      } else if (!user && type === 'login') {
        return res.status(404).json({
          error: 'User not found. Please sign up first.',
        })
      }

      // Create session
      const refreshToken = require('crypto').randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await prisma.session.create({
        data: {
          userId: user!.id,
          refreshToken,
          userAgent: req.get('user-agent'),
          ipAddress: req.ip,
          expiresAt,
        },
      })

      // Generate JWT tokens (assuming you have a token service)
      // This would typically be done in a TokenService
      const accessToken = 'temp-access-token' // Replace with actual JWT generation

      logger.info({ userId: user!.id }, 'User authenticated via OTP')

      res.json({
        message: 'OTP verified successfully',
        accessToken,
        refreshToken,
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
      const { email, phone, type = 'login' } = req.body

      if (!email && !phone) {
        return res
          .status(400)
          .json({ error: 'Email or phone is required' })
      }

      // Generate new OTP
      const otp = OtpService.generateOtp()
      const expiresAt = OtpService.getExpiryTime()

      if (email) {
        // Update email OTP
        await prisma.otpVerification.upsert({
          where: {
            email_type: {
              email,
              type: type as any,
            },
          },
          create: {
            email,
            code: otp,
            type: type as any,
            expiresAt,
          },
          update: {
            code: otp,
            expiresAt,
            isUsed: false,
            usedAt: null,
          },
        })

        // Send OTP
        await OtpService.sendEmailOtp(email, otp)
      } else {
        // Update phone OTP
        await prisma.otpVerification.upsert({
          where: {
            phone_type: {
              phone,
              type: type as any,
            },
          },
          create: {
            phone,
            code: otp,
            type: type as any,
            expiresAt,
          },
          update: {
            code: otp,
            expiresAt,
            isUsed: false,
            usedAt: null,
          },
        })

        // Send OTP
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
