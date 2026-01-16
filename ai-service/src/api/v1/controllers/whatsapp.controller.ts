import { Request, Response } from 'express';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { processMessage } from '../../services/ollama.service.js';
import { sendWhatsAppMessage, markMessageAsRead } from '../../services/whatsapp.service.js';
import type { WhatsAppWebhookPayload, ConversationContext } from '../../types/index.js';

// Simple in-memory context store (use Redis in production)
const conversationContexts = new Map<string, ConversationContext>();

export class WhatsAppController {
  /**
   * Webhook verification (GET)
   * Meta sends this to verify webhook URL ownership
   */
  static verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.debug({ mode, token }, 'Webhook verification request');

    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      logger.info('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.warn({ mode, token }, 'Webhook verification failed');
      res.sendStatus(403);
    }
  }

  /**
   * Handle incoming WhatsApp messages (POST)
   */
  static async handleMessage(req: Request, res: Response): Promise<void> {
    // Always respond 200 immediately to acknowledge receipt
    res.sendStatus(200);

    try {
      const payload = req.body as WhatsAppWebhookPayload;
      
      // Validate payload structure
      if (payload.object !== 'whatsapp_business_account') {
        return;
      }

      // Process each entry
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          
          // Skip non-message events
          if (!value.messages || value.messages.length === 0) {
            continue;
          }

          for (const message of value.messages) {
            // Only handle text messages for now
            if (message.type !== 'text' || !message.text?.body) {
              continue;
            }

            const phoneNumber = message.from;
            const userMessage = message.text.body;
            const messageId = message.id;

            logger.info({ phoneNumber, userMessage }, 'Received WhatsApp message');

            // Mark as read
            await markMessageAsRead(messageId);

            // Get or create conversation context
            let context = conversationContexts.get(phoneNumber);
            if (!context) {
              context = {
                phoneNumber,
                messageCount: 0,
                lastJobs: []
              };
              conversationContexts.set(phoneNumber, context);
            }
            context.messageCount++;

            // Extract user ID from message if present (format: [UserID: xxx])
            const userIdMatch = userMessage.match(/\[UserID:\s*([^\]]+)\]/);
            if (userIdMatch) {
              context.userId = userIdMatch[1].trim();
              logger.info({ phoneNumber, userId: context.userId }, 'User ID linked');
            }

            // Process with Ollama
            const aiResponse = await processMessage(userMessage, context);

            // Extract job IDs from response if present (for context tracking)
            // This is a simple pattern - could be more sophisticated
            const jobIdPattern = /ID:\s*([a-f0-9]{24})/gi;
            const jobMatches = aiResponse.matchAll(jobIdPattern);
            const newJobs: Array<{ id: string; title: string }> = [];
            for (const match of jobMatches) {
              newJobs.push({ id: match[1], title: 'Job' });
            }
            if (newJobs.length > 0) {
              context.lastJobs = newJobs;
            }

            // Send response via WhatsApp
            await sendWhatsAppMessage(phoneNumber, aiResponse);
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error handling WhatsApp message');
    }
  }
}
