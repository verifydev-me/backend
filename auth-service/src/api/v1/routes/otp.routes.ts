import { Router } from 'express'
import { OtpController } from '@/api/v1/controllers/otp.controller'

const router = Router()

/**
 * Request OTP for email
 * POST /v1/auth/otp/request-email
 */
router.post('/request-email', OtpController.requestEmailOtp)

/**
 * Request OTP for phone
 * POST /v1/auth/otp/request-phone
 */
router.post('/request-phone', OtpController.requestPhoneOtp)

/**
 * Verify OTP
 * POST /v1/auth/otp/verify
 */
router.post('/verify', OtpController.verifyOtp)

/**
 * Resend OTP
 * POST /v1/auth/otp/resend
 */
router.post('/resend', OtpController.resendOtp)

export default router
