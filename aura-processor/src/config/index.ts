export const config = {
  databaseUrl: process.env.DATABASE_URL || '',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  consumeQueue: process.env.CONSUME_QUEUE || 'project.analyzed',
  exchangeName: process.env.EXCHANGE_NAME || 'project.events',
  nodeEnv: process.env.NODE_ENV || 'development',
};
