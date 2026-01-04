import { randomUUID } from 'crypto';
import { rabbitmqPublisher } from '../rabbitmq/publisher.js';
import { logger } from '../utils/logger.js';

export interface GenerateResumeDto {
  template?: 'modern' | 'classic' | 'developer' | 'corporate';
  format?: 'pdf' | 'html';
}

export class ResumeService {
  /**
   * Request resume generation
   * Returns a requestId that can be used to poll for status
   */
  static async generateResume(userId: string, options: GenerateResumeDto = {}) {
    const requestId = randomUUID();
    const template = options.template || 'modern';
    const format = options.format || 'pdf';

    // Publish to RabbitMQ for async processing
    const published = await rabbitmqPublisher.publishResumeRequest({
      userId,
      template,
      format,
      requestId,
    });

    if (!published) {
      throw new Error('Failed to queue resume generation');
    }

    logger.info({ userId, requestId, template, format }, 'Resume generation requested');

    return {
      requestId,
      status: 'processing',
      message: 'Resume generation started. This may take a few seconds.',
    };
  }
}

export default ResumeService;
