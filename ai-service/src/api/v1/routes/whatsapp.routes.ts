import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/ai/whatsapp/webhook
 * @desc    WhatsApp webhook verification
 * @access  Public (Meta sends verification requests here)
 */
router.get('/webhook', WhatsAppController.verifyWebhook);

/**
 * @route   POST /api/v1/ai/whatsapp/webhook
 * @desc    Handle incoming WhatsApp messages
 * @access  Public (Meta sends messages here)
 */
router.post('/webhook', WhatsAppController.handleMessage);

export default router;
