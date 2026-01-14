// ==================== NOTIFICATION SERVICE ====================

import * as amqp from 'amqplib';
// @ts-ignore
import { type Connection, type Channel } from 'amqplib';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let connection: Connection | null = null;
let channel: Channel | null = null;

export interface OfflineMessageEvent {
  type: 'chat.message.offline';
  payload: {
    recipientId: string;
    senderId: string;
    senderName: string;
    roomId: string;
    preview: string;
    jobId: string;
    timestamp: string;
  };
}

export async function connectRabbitMQ(): Promise<void> {
  try {
    // @ts-ignore
    connection = await amqp.connect(config.rabbitmq.url);
    // @ts-ignore
    channel = await connection.createChannel();

    // Setup exchange
    await channel!.assertExchange(config.rabbitmq.exchange, 'topic', {
      durable: true,
    });

    logger.info('✅ RabbitMQ connected');
  } catch (error) {
    logger.error({ error }, '❌ RabbitMQ connection failed');
    // Don't throw - chat should work without notifications
  }
}

export const notificationService = {
  /**
   * Publish offline message notification
   * This will be consumed by notification-service to send email/push
   */
  async publishOfflineMessage(event: OfflineMessageEvent['payload']): Promise<void> {
    if (!channel) {
      logger.warn('RabbitMQ not connected, skipping notification');
      return;
    }

    try {
      const message: OfflineMessageEvent = {
        type: 'chat.message.offline',
        payload: event,
      };

      channel.publish(
        config.rabbitmq.exchange,
        'chat.message.offline',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      logger.debug({ recipientId: event.recipientId }, '📧 Offline notification published');
    } catch (error) {
      logger.error({ error }, 'Failed to publish notification');
    }
  },
};

export async function closeRabbitMQ(): Promise<void> {
  if (channel) await (channel as any).close();
  if (connection) await (connection as any).close();
  logger.info('RabbitMQ connection closed');
}
