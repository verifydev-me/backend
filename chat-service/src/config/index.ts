// ==================== CHAT SERVICE CONFIGURATION ====================

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB (via Prisma)
  database: {
    url: process.env.DATABASE_URL || 'mongodb://mongodb:27017/verifydev_chat',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672',
    exchange: 'chat.events',
  },

  // JWT (Same as auth-service)
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'supersecretaccesskey32characters!',
  },

  // WebSocket
  ws: {
    pingInterval: 25000,      // 25 seconds
    pingTimeout: 30000,       // 30 seconds
    maxConnPerUser: 5,        // Max tabs per user
  },

  // Rate Limiting
  rateLimit: {
    messagesPerSecond: 10,
    joinRoomPerMinute: 30,
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(current => current.trim()),
    credentials: true,
  },
} as const;

export type Config = typeof config;
