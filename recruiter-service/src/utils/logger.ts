import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  base: { service: 'recruiter-service' },
});
