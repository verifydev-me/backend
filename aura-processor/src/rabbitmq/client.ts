import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export class RabbitMQClient {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Setup queue
      await this.channel.assertExchange(config.exchangeName, 'direct', {
        durable: true,
      });

      await this.channel.assertQueue(config.consumeQueue, {
        durable: true,
      });

      await this.channel.bindQueue(
        config.consumeQueue,
        config.exchangeName,
        config.consumeQueue
      );

      // Prefetch 1 - process one at a time
      await this.channel.prefetch(1);

      logger.info('✅ RabbitMQ connected');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to RabbitMQ');
      throw error;
    }
  }

  async consume(
    handler: (msg: ConsumeMessage) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.consume(
      config.consumeQueue,
      async (msg) => {
        if (!msg) return;

        try {
          await handler(msg);
          this.channel?.ack(msg);
        } catch (error) {
          logger.error({ error }, 'Failed to process message');
          // Requeue on failure
          this.channel?.nack(msg, false, true);
        }
      },
      { noAck: false }
    );

    logger.info(`📥 Consuming from queue: ${config.consumeQueue}`);
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    logger.info('RabbitMQ connection closed');
  }
}

export const rabbitmq = new RabbitMQClient();
