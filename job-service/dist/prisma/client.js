"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const index_js_1 = require("../../node_modules/.prisma/job-client/index.js");
const logger_js_1 = require("../utils/logger.js");
exports.prisma = new index_js_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        logger_js_1.logger.info('✅ MongoDB connected (Job Service)');
    }
    catch (error) {
        logger_js_1.logger.error({ error }, '❌ Failed to connect to MongoDB');
        throw error;
    }
}
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        logger_js_1.logger.info('PostgreSQL disconnected');
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Error disconnecting from PostgreSQL');
    }
}
exports.default = exports.prisma;
//# sourceMappingURL=client.js.map