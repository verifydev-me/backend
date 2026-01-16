import { Request, Response } from 'express';
import { processMessage } from '../../services/ollama.service.js';
import { logger } from '../../utils/logger.js';

export class QueryController {
  /**
   * Direct query endpoint for testing/internal use
   * POST /api/v1/ai/query
   */
  static async processQuery(req: Request, res: Response): Promise<void> {
    try {
      const { query, userId } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ 
          success: false, 
          error: 'Query is required' 
        });
        return;
      }

      logger.info({ query, userId }, 'Processing direct query');

      const response = await processMessage(query, userId ? { 
        phoneNumber: 'direct',
        userId,
        messageCount: 1
      } : undefined);

      res.json({
        success: true,
        data: {
          query,
          response
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error processing query');
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process query' 
      });
    }
  }

  /**
   * Parse intent without executing (for debugging)
   * POST /api/v1/ai/parse
   */
  static async parseIntent(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ 
          success: false, 
          error: 'Query is required' 
        });
        return;
      }

      // For now, return processed response
      // In future, could add intent-only parsing
      const response = await processMessage(query);

      res.json({
        success: true,
        data: {
          query,
          response
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error parsing intent');
      res.status(500).json({ 
        success: false, 
        error: 'Failed to parse intent' 
      });
    }
  }
}
