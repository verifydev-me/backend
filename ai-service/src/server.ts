import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { checkOllamaHealth } from './services/ollama.service.js';
import whatsappRoutes from './api/v1/routes/whatsapp.routes.js';
import queryRoutes from './api/v1/routes/query.routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.debug({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const ollamaHealthy = await checkOllamaHealth();
  
  res.json({
    status: 'ok',
    service: 'ai-service',
    timestamp: new Date().toISOString(),
    dependencies: {
      ollama: ollamaHealthy ? 'healthy' : 'unhealthy'
    }
  });
});

// API Routes
app.use('/api/v1/ai/whatsapp', whatsappRoutes);
app.use('/api/v1/ai', queryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not found' 
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ error: err }, 'Unhandled error');
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info({ port: PORT, env: config.nodeEnv }, '🤖 AI Service started');
  logger.info({ ollamaHost: config.ollama.host, model: config.ollama.model }, 'Ollama config');
  
  // Check Ollama health on startup
  checkOllamaHealth().then(healthy => {
    if (healthy) {
      logger.info('✅ Ollama connection healthy');
    } else {
      logger.warn('⚠️ Ollama not available - AI features will be limited');
    }
  });
});

export default app;
