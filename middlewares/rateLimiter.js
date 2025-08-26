const rateLimit = require('express-rate-limit');
const securityErrorHandler = require('../utils/securityErrorHandler');
const { RATE_LIMIT_CONFIG } = require('../config/constants');

/**
 * Rate limiting configuration for authentication endpoints
 * Uses IP-based limiting for security protection
 */

// Helper function to create rate limiter with consistent configuration
const createRateLimit = (config) => {
    return rateLimit({
        windowMs: config.WINDOW_MS,
        max: config.MAX_REQUESTS,
        message: {
            status: 429,
            error: config.MESSAGE,
            message: config.WAIT_MESSAGE,
            retryAfter: Math.round(config.WINDOW_MS / 1000)
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            const retryAfter = Math.round(config.WINDOW_MS / 1000);
            res.set('Retry-After', retryAfter);
            const rateLimitError = new Error(config.MESSAGE);
            const errorResponse = securityErrorHandler.handleRateLimitError(
                rateLimitError, 
                req, 
                retryAfter
            );
            return res.status(errorResponse.status).json(errorResponse);
        },
        keyGenerator: (req) => {
            // Use IP address for rate limiting
            return req.ip;
        }
    });
};

// Rate limiters using centralized configuration
const otpRateLimit = createRateLimit(RATE_LIMIT_CONFIG.OTP);
const loginRateLimit = createRateLimit(RATE_LIMIT_CONFIG.LOGIN);
const registerRateLimit = createRateLimit(RATE_LIMIT_CONFIG.REGISTER);

module.exports = {
    otpRateLimit,
    loginRateLimit,
    registerRateLimit
};