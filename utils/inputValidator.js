const crypto = require('crypto');

/**
 * Input Validation and Sanitization Utilities
 * Provides comprehensive validation for user inputs with security focus
 */

class InputValidator {
  /**
   * Validate Iranian phone number format
   * Supports formats: 09123456789, +989123456789, 00989123456789
   * @param {string} phone - Phone number to validate
   * @returns {Object} - {isValid: boolean, sanitized: string, error: string}
   */
  static validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return {
        isValid: false,
        sanitized: '',
        error: 'شماره تلفن الزامی است'
      };
    }

    // Remove all non-digit characters except +
    let sanitized = phone.replace(/[^\d+]/g, '');
    
    // Handle different formats
    if (sanitized.startsWith('+98')) {
      sanitized = '0' + sanitized.substring(3);
    } else if (sanitized.startsWith('0098')) {
      sanitized = '0' + sanitized.substring(4);
    } else if (sanitized.startsWith('98') && sanitized.length === 12) {
      sanitized = '0' + sanitized.substring(2);
    }

    // Validate Iranian mobile format (09xxxxxxxxx)
    const iranianMobileRegex = /^09[0-9]{9}$/;
    
    if (!iranianMobileRegex.test(sanitized)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'فرمت شماره تلفن صحیح نیست. مثال: 09123456789'
      };
    }

    return {
      isValid: true,
      sanitized: sanitized,
      error: null
    };
  }

  /**
   * Validate and sanitize username
   * Rules: 3-30 characters, alphanumeric + underscore, no consecutive underscores
   * @param {string} username - Username to validate
   * @returns {Object} - {isValid: boolean, sanitized: string, error: string}
   */
  static validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return {
        isValid: false,
        sanitized: '',
        error: 'نام کاربری الزامی است'
      };
    }

    // Trim whitespace
    let sanitized = username.trim();

    // Check length
    if (sanitized.length < 3) {
      return {
        isValid: false,
        sanitized: '',
        error: 'نام کاربری باید حداقل 3 کاراکتر باشد'
      };
    }

    if (sanitized.length > 30) {
      return {
        isValid: false,
        sanitized: '',
        error: 'نام کاربری نباید بیشتر از 30 کاراکتر باشد'
      };
    }

    // Check allowed characters (alphanumeric + underscore)
    const allowedCharsRegex = /^[a-zA-Z0-9_]+$/;
    if (!allowedCharsRegex.test(sanitized)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و خط زیر باشد'
      };
    }

    // Check for consecutive underscores
    if (sanitized.includes('__')) {
      return {
        isValid: false,
        sanitized: '',
        error: 'نام کاربری نمی‌تواند شامل خط زیر متوالی باشد'
      };
    }

    // Check if starts or ends with underscore
    if (sanitized.startsWith('_') || sanitized.endsWith('_')) {
      return {
        isValid: false,
        sanitized: '',
        error: 'نام کاربری نمی‌تواند با خط زیر شروع یا تمام شود'
      };
    }

    return {
      isValid: true,
      sanitized: sanitized.toLowerCase(), // Normalize to lowercase
      error: null
    };
  }

  /**
   * Validate OTP code
   * Rules: exactly 6 digits
   * @param {string} code - OTP code to validate
   * @returns {Object} - {isValid: boolean, sanitized: string, error: string}
   */
  static validateOTPCode(code) {
    if (!code || typeof code !== 'string') {
      return {
        isValid: false,
        sanitized: '',
        error: 'کد تایید الزامی است'
      };
    }

    // Remove all non-digit characters
    const sanitized = code.replace(/\D/g, '');

    // Check if exactly 6 digits
    if (sanitized.length !== 6) {
      return {
        isValid: false,
        sanitized: '',
        error: 'کد تایید باید 6 رقم باشد'
      };
    }

    return {
      isValid: true,
      sanitized: sanitized,
      error: null
    };
  }

  /**
   * Validate refresh token format
   * Basic format validation for JWT tokens
   * @param {string} token - Refresh token to validate
   * @returns {Object} - {isValid: boolean, sanitized: string, error: string}
   */
  static validateRefreshToken(token) {
    if (!token || typeof token !== 'string') {
      return {
        isValid: false,
        sanitized: '',
        error: 'کد بازیابی الزامی است'
      };
    }

    const sanitized = token.trim();

    // Basic JWT format check (three parts separated by dots)
    const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    
    if (!jwtRegex.test(sanitized)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'فرمت کد بازیابی صحیح نیست'
      };
    }

    return {
      isValid: true,
      sanitized: sanitized,
      error: null
    };
  }

  /**
   * General input sanitization
   * Removes potentially dangerous characters and normalizes input
   * @param {string} input - Input to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} - Sanitized input
   */
  static sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Trim whitespace by default
    if (options.trim !== false) {
      sanitized = sanitized.trim();
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters except newlines and tabs if preserveWhitespace is false
    if (!options.preserveWhitespace) {
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    // Normalize Unicode if specified
    if (options.normalizeUnicode) {
      sanitized = sanitized.normalize('NFC');
    }

    // Limit length if specified
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize multiple inputs based on schema
   * @param {Object} data - Data object to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} - {isValid: boolean, sanitized: Object, errors: Object}
   */
  static validateAndSanitize(data, schema) {
    const result = {
      isValid: true,
      sanitized: {},
      errors: {}
    };

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      let fieldResult;

      // Skip validation for optional fields that are empty/undefined
      if (rules.required === false && (!value || (typeof value === 'string' && value.trim() === ''))) {
        result.sanitized[field] = value || '';
        continue;
      }

      switch (rules.type) {
        case 'phone':
          fieldResult = this.validatePhoneNumber(value);
          break;
        case 'username':
          fieldResult = this.validateUsername(value);
          break;
        case 'otp':
          fieldResult = this.validateOTPCode(value);
          break;
        case 'refreshToken':
          fieldResult = this.validateRefreshToken(value);
          break;
        default:
          // Generic validation
          if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
            fieldResult = {
              isValid: false,
              sanitized: '',
              error: rules.errorMessage || `${field} الزامی است`
            };
          } else {
            fieldResult = {
              isValid: true,
              sanitized: this.sanitizeInput(value, rules.sanitizeOptions),
              error: null
            };
          }
      }

      if (!fieldResult.isValid) {
        result.isValid = false;
        result.errors[field] = fieldResult.error;
      } else {
        result.sanitized[field] = fieldResult.sanitized;
      }
    }

    return result;
  }

  /**
   * Create validation middleware for Express routes
   * @param {Object} schema - Validation schema
   * @returns {Function} - Express middleware function
   */
  static createValidationMiddleware(schema) {
    return (req, res, next) => {
      const validation = this.validateAndSanitize(req.body, schema);
      
      if (!validation.isValid) {
        const { sendErrorResponse } = require('./responseHandler');
        return sendErrorResponse(res, 400, "ورودی نامعتبر", validation.errors);
      }

      // Replace req.body with sanitized data
      req.body = { ...req.body, ...validation.sanitized };
      next();
    };
  }
}

module.exports = InputValidator;