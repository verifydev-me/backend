"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_js_1 = require("./config/env.js");
const logger_js_1 = require("./utils/logger.js");
const client_js_1 = require("./prisma/client.js");
const index_js_1 = __importDefault(require("./api/v1/index.js"));
const app = (0, express_1.default)();
// Security
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_js_1.env.ALLOWED_ORIGINS, credentials: true }));
app.use((0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express_1.default.json());
// Health check
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Job Service is healthy',
        data: { service: 'job-service', version: '1.0.0' },
    });
});
// API Routes
app.use('/api/v1', index_js_1.default);
// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        error: { code: 'NOT_FOUND' },
    });
});
// Error handler
app.use((err, req, res, next) => {
    logger_js_1.logger.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: { code: err.code || 'INTERNAL_ERROR' },
    });
});
// Start server with database connection
async function startServer() {
    try {
        // Connect to database
        await (0, client_js_1.connectDatabase)();
        app.listen(env_js_1.env.PORT, () => {
            logger_js_1.logger.info(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   💼 Job Service Started                                     ║
║   ─────────────────────────────────────────────────────      ║
║   Port:        ${env_js_1.env.PORT}                                        ║
║   Environment: ${env_js_1.env.NODE_ENV}                                   ║
║                                                              ║
║   📋 Job Management:                                         ║
║   • GET/POST   /api/v1/jobs          - Jobs CRUD             ║
║   • POST       /api/v1/jobs/:id/publish - Publish job        ║
║   • GET        /api/v1/jobs/:id/stats - Job statistics       ║
║                                                              ║
║   📝 Applications:                                           ║
║   • POST       /api/v1/applications  - Apply to job          ║
║   • GET        /api/v1/applications/my-applications          ║
║   • PATCH      /api/v1/applications/:id/status               ║
║                                                              ║
║   🗓️  Interviews:                                            ║
║   • POST       /api/v1/interviews    - Schedule interview    ║
║   • GET        /api/v1/interviews/upcoming                   ║
║   • POST       /api/v1/interviews/:id/confirm                ║
║                                                              ║
║   💬 Messages:                                               ║
║   • GET/POST   /api/v1/messages      - Messaging            ║
║   • GET        /api/v1/messages/inbox                        ║
║   • GET        /api/v1/messages/unread-count                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
        });
    }
    catch (error) {
        logger_js_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_js_1.logger.info('SIGTERM received, shutting down...');
    await (0, client_js_1.disconnectDatabase)();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_js_1.logger.info('SIGINT received, shutting down...');
    await (0, client_js_1.disconnectDatabase)();
    process.exit(0);
});
startServer();
//# sourceMappingURL=server.js.map