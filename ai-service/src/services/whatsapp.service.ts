import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const WHATSAPP_API = 'https://graph.facebook.com/v18.0';

/**
 * Send a text message via WhatsApp
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) {
    logger.warn('WhatsApp credentials not configured');
    return false;
  }

  try {
    const url = `${WHATSAPP_API}/${config.whatsapp.phoneNumberId}/messages`;
    
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { 
          preview_url: false,
          body: message 
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info({ to, messageLength: message.length }, 'WhatsApp message sent');
    return true;
  } catch (error: any) {
    logger.error({ 
      error: error.response?.data || error.message, 
      to 
    }, 'Failed to send WhatsApp message');
    return false;
  }
}

/**
 * Send a message with quick reply buttons
 */
export async function sendWhatsAppButtons(
  to: string, 
  bodyText: string, 
  buttons: Array<{ id: string; title: string }>
): Promise<boolean> {
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) {
    logger.warn('WhatsApp credentials not configured');
    return false;
  }

  try {
    const url = `${WHATSAPP_API}/${config.whatsapp.phoneNumberId}/messages`;
    
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title.substring(0, 20) }
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info({ to, buttonCount: buttons.length }, 'WhatsApp buttons sent');
    return true;
  } catch (error: any) {
    logger.error({ 
      error: error.response?.data || error.message, 
      to 
    }, 'Failed to send WhatsApp buttons');
    return false;
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  if (!config.whatsapp.token || !config.whatsapp.phoneNumberId) {
    return;
  }

  try {
    const url = `${WHATSAPP_API}/${config.whatsapp.phoneNumberId}/messages`;
    
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    // Silently fail for read receipts
    logger.debug({ messageId }, 'Failed to mark message as read');
  }
}
