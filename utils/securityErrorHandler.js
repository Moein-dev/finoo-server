const crypto = require("crypto");

/**
 * Security Error Handler
 * Provides centralized error handling with sanitization and security logging
 */
class SecurityErrorHandler {
  constructor() {
    this.securityEvents = [];
  }

  /**
   * Handle database errors with sanitization
   * @param {Error} error - The database error
   * @param {Object} request - Express request object
   * @returns {Object} Sanitized error response
   */
  handleDatabaseError(error, request = null) {
    // Log detailed error for debugging
    this.logSecurityEvent("database_error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      ip_address: request?.ip,
      user_agent: request?.get("User-Agent"),
      user_id: request?.user?.id,
    });

    // Return generic error to client
    return {
      status: 500,
      error: "خطای داخلی سرور رخ داده است",
      code: "INTERNAL_SERVER_ERROR",
    };
  }

  /**
   * Handle validation errors with field-specific messages
   * @param {Error} error - The validation error
   * @param {Object} request - Express request object
   * @returns {Object} Sanitized validation error response
   */
  handleValidationError(error, request = null) {
    this.logSecurityEvent("validation_error", {
      error: error.message,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      ip_address: request?.ip,
      user_agent: request?.get("User-Agent"),
      user_id: request?.user?.id,
    });

    // Extract field-specific validation errors if available
    let details = null;
    if (error.field && error.message) {
      details = {
        field: error.field,
        message: this.sanitizeValidationMessage(error.message),
      };
    }

    return {
      status: 400,
      error: "اطلاعات ارسالی نامعتبر است",
      code: "VALIDATION_ERROR",
      details,
    };
  }

  /**
   * Handle authentication errors
   * @param {Error} error - The authentication error
   * @param {Object} request - Express request object
   * @returns {Object} Sanitized authentication error response
   */
  handleAuthenticationError(error, request = null) {
    this.logSecurityEvent("authentication_error", {
      error: error.message,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      ip_address: request?.ip,
      user_agent: request?.get("User-Agent"),
      attempted_user: request?.body?.username || request?.body?.phone,
    });

    // Generic authentication error message
    return {
      status: 401,
      error: "احراز هویت ناموفق بود",
      code: "AUTHENTICATION_FAILED",
    };
  }

  /**
   * Handle rate limiting errors
   * @param {Error} error - The rate limit error
   * @param {Object} request - Express request object
   * @param {number} retryAfter - Seconds until retry is allowed
   * @returns {Object} Rate limit error response
   */
  handleRateLimitError(error, request = null, retryAfter = null) {
    this.logSecurityEvent("rate_limit_exceeded", {
      error: error.message,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      ip_address: request?.ip,
      user_agent: request?.get("User-Agent"),
      user_id: request?.user?.id,
      retry_after: retryAfter,
    });

    return {
      status: 429,
      error: "تعداد درخواست‌ها از حد مجاز فراتر رفته است",
      code: "RATE_LIMIT_EXCEEDED",
      retry_after: retryAfter,
    };
  }

  /**
   * Handle OTP-related errors
   * @param {Error} error - The OTP error
   * @param {Object} request - Express request object
   * @returns {Object} Sanitized OTP error response
   */
  handleOTPError(error, request = null) {
    this.logSecurityEvent("otp_error", {
      error: error.message,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      ip_address: request?.ip,
      user_agent: request?.get("User-Agent"),
      phone: request?.body?.phone
        ? this.maskPhoneNumber(request.body.phone)
        : null,
    });

    return {
      status: 400,
      error: "کد تایید نامعتبر، منقضی شده یا قبلاً استفاده شده است",
      code: "INVALID_OTP",
    };
  }

  /**
   * Handle JWT token errors
   * @param {Error} error - The JWT error
   * @param {Object} request - Express request object
   * @returns {Object} Sanitized JWT error response
   */
  handleJWTError(error, request = null) {
    this.logSecurityEvent("jwt_error", {
      error: error.message,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      ip_address: request?.ip,
      user_agent: request?.get("User-Agent"),
      token_type: error.tokenType || "unknown",
    });

    return {
      status: 403,
      error: "توکن نامعتبر یا منقضی شده است",
      code: "INVALID_TOKEN",
    };
  }

  /**
   * Generic error handler for unknown errors
   * @param {Error} error - The unknown error
   * @param {Object} request - Express request object
   * @returns {Object} Generic error response
   */
  handleGenericError(error, request = null) {
    this.logSecurityEvent("generic_error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId(),
      ip_address: request?.ip,
      user_agent: request?.get("User-Agent"),
      user_id: request?.user?.id,
    });

    return {
      status: 500,
      error: "خطای غیرمنتظره‌ای رخ داده است",
      code: "UNEXPECTED_ERROR",
    };
  }

  /**
   * Log security events for monitoring and analysis
   * @param {string} eventType - Type of security event
   * @param {Object} details - Event details
   */
  logSecurityEvent(eventType, details) {
    const event = {
      id: this.generateRequestId(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      ...details,
    };

    // Log to console (in production, this should go to a proper logging system)
    console.error(
      `🔒 Security Event [${eventType}]:`,
      JSON.stringify(event, null, 2)
    );

    // Store in memory for potential analysis (in production, use proper storage)
    this.securityEvents.push(event);

    // Keep only last 1000 events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }
  }

  /**
   * Sanitize error for client response
   * @param {Error} error - The error to sanitize
   * @returns {Object} Sanitized error object
   */
  sanitizeErrorForClient(error) {
    // Never expose stack traces, database details, or internal paths
    const sanitized = {
      message: error.message || "خطای غیرمنتظره‌ای رخ داده است",
    };

    // Remove sensitive information patterns
    sanitized.message = sanitized.message
      .replace(/password/gi, "[REDACTED]")
      .replace(/secret/gi, "[REDACTED]")
      .replace(/token/gi, "[REDACTED]")
      .replace(/key/gi, "[REDACTED]")
      .replace(/\/[a-zA-Z0-9\/\-_\.]+\.(js|ts|json)/g, "[FILE_PATH]")
      .replace(/at\s+[^\s]+\s+\([^)]+\)/g, "[STACK_TRACE]");

    return sanitized;
  }

  /**
   * Sanitize validation messages to remove sensitive information
   * @param {string} message - Validation message
   * @returns {string} Sanitized message
   */
  sanitizeValidationMessage(message) {
    return message
      .replace(/password/gi, "رمز عبور")
      .replace(/token/gi, "توکن")
      .replace(/secret/gi, "کلید مخفی")
      .replace(/key/gi, "کلید");
  }

  /**
   * Mask phone number for logging
   * @param {string} phone - Phone number to mask
   * @returns {string} Masked phone number
   */
  maskPhoneNumber(phone) {
    if (!phone || phone.length < 4) return "****";
    return phone.slice(0, 2) + "****" + phone.slice(-2);
  }

  /**
   * Generate unique request ID for tracking
   * @returns {string} Unique request ID
   */
  generateRequestId() {
    return crypto.randomBytes(8).toString("hex");
  }

  /**
   * Get recent security events (for monitoring)
   * @param {number} limit - Number of events to return
   * @returns {Array} Recent security events
   */
  getRecentSecurityEvents(limit = 50) {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Clear security events (for testing or maintenance)
   */
  clearSecurityEvents() {
    this.securityEvents = [];
  }
}

// Create singleton instance
const securityErrorHandler = new SecurityErrorHandler();

module.exports = securityErrorHandler;
