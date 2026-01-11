import amqp from 'amqplib';
import type { ChannelModel, Channel } from 'amqplib';
import { logger } from '../utils/logger.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'project.events';
const ANALYZE_QUEUE = 'project.analyze.request';
const RESUME_QUEUE = 'resume.generate.request';

class RabbitMQPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
      
      // Declare DLX (dead letter exchange) - must match project-analyzer
      await this.channel.assertExchange(EXCHANGE_NAME + '.dlx', 'direct', { durable: true });
      
      // Declare analyze queue with same arguments as project-analyzer (Go service)
      await this.channel.assertQueue(ANALYZE_QUEUE, { 
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGE_NAME + '.dlx'
        }
      });
      await this.channel.bindQueue(ANALYZE_QUEUE, EXCHANGE_NAME, ANALYZE_QUEUE);

      // Declare resume queue
      await this.channel.assertQueue(RESUME_QUEUE, { 
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGE_NAME + '.dlx'
        }
      });
      await this.channel.bindQueue(RESUME_QUEUE, EXCHANGE_NAME, RESUME_QUEUE);

      // Handle connection errors
      this.connection.on('error', (err) => {
        logger.error({ error: err }, 'RabbitMQ connection error');
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
      });

      this.isConnected = true;
      logger.info('✅ RabbitMQ publisher connected');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to RabbitMQ');
      // Non-fatal - service can work without publishing
      this.isConnected = false;
    }
  }

  async publishAnalyzeRequest(data: {
    projectId: string;
    userId: string;
    repoUrl: string;
    repoName: string;
    defaultBranch: string;
    projectType?: string;
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

  async publishResumeRequest(data: {
    userId: string;
    template: string;
    format: string;
    requestId: string;
  }): Promise<boolean> {
    if (!this.channel || !this.isConnected) {
      logger.warn('RabbitMQ not connected, cannot publish resume request');
      return false;
    }

    try {
      const message = Buffer.from(JSON.stringify(data));

      this.channel.publish(
        EXCHANGE_NAME,
        RESUME_QUEUE,
        message,
        {
          persistent: true,
          contentType: 'application/json',
        }
      );

      logger.info({ userId: data.userId, requestId: data.requestId }, 'Resume request published');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to publish resume request');
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignore close errors
    }
    this.isConnected = false;
  }
}

export const rabbitmqPublisher = new RabbitMQPublisher();

