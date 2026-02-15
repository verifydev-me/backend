"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const logger_js_1 = require("../utils/logger.js");
function isRecruiterPayload(payload) {
    return 'recruiterId' in payload;
}
/**
 * Authentication middleware - verifies JWT token
 * Supports both user and recruiter tokens
 * Adds user object to request if valid
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'No token provided',
                error: { code: 'NO_TOKEN' }
            });
            return;
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_ACCESS_SECRET);
            // Handle both user and recruiter tokens
            if (isRecruiterPayload(decoded)) {
                // Recruiter token - map recruiterId to userId for compatibility
                req.user = {
                    userId: decoded.recruiterId,
                    sessionId: decoded.organizationId, // Use organizationId as sessionId
                    role: 'recruiter',
                };
            }
            else {
                // User token
                req.user = {
                    userId: decoded.userId,
                    sessionId: decoded.sessionId,
                    role: 'user',
                };
            }
            next();
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                res.status(401).json({
                    success: false,
                    message: 'Token expired',
                    error: { code: 'TOKEN_EXPIRED' }
                });
                return;
            }
            res.status(401).json({
                success: false,
                message: 'Invalid token',
                error: { code: 'INVALID_TOKEN' }
            });
        }
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Authentication error');
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: { code: 'AUTH_ERROR' }
        });
    }
}
/**
 * Optional authentication - doesn't require token but parses it if present
 * Supports both user and recruiter tokens
 */
async function optionalAuth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_ACCESS_SECRET);
                // Handle both user and recruiter tokens
                if (isRecruiterPayload(decoded)) {
                    req.user = {
                        userId: decoded.recruiterId,
                        sessionId: decoded.organizationId,
                    };
                }
                else {
                    req.user = {
                        userId: decoded.userId,
                        sessionId: decoded.sessionId,
                    };
                }
            }
            catch {
                // Token invalid but that's okay for optional auth
                req.user = undefined;
            }
        }
        next();
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Optional auth error');
        next();
    }
}
exports.default = authenticate;
//# sourceMappingURL=authenticate.js.map