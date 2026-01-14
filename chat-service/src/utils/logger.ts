// ==================== LOGGER ====================

import pino from 'pino';
import { config } from '../config/index.js';

// @ts-ignore
export const logger = (pino as unknown as Function)({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  base: {
    service: 'chat-service',
  },
});
