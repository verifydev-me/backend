import amqp, { Connection, Channel } from 'amqplib';
import { logger } from '../utils/logger.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'project.events';
const ANALYZE_QUEUE = 'project.analyze.request';

class RabbitMQPublisher {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
      await this.channel.assertQueue(ANALYZE_QUEUE, { durable: true });
      await this.channel.bindQueue(ANALYZE_QUEUE, EXCHANGE_NAME, ANALYZE_QUEUE);

      this.isConnected = true;
      logger.info('✅ RabbitMQ publisher connected');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to RabbitMQ');
      // Non-fatal - service can work without publishing
    }
  }

  async publishAnalyzeRequest(data: {
    projectId: string;
    userId: string;
    repoUrl: string;
    repoName: string;
    defaultBranch: string;
  }): Promise<boolean> {
    if (!this.channel || !this.isConnected) {
      logger.warn('RabbitMQ not connected, cannot publish');
      return false;
    }

    try {
      const message = Buffer.from(JSON.stringify(data));

      this.channel.publish(
        EXCHANGE_NAME,
        ANALYZE_QUEUE,
        message,
        {
          persistent: true,
          contentType: 'application/json',
        }
      );

      logger.info({ projectId: data.projectId }, 'Analyze request published');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to publish analyze request');
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.isConnected = false;
  }
}

export const rabbitmqPublisher = new RabbitMQPublisher();
