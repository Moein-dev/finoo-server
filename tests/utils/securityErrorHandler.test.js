const securityErrorHandler = require('../../utils/securityErrorHandler');

describe('Security Error Handler', () => {
  beforeEach(() => {
    // Clear security events before each test
    securityErrorHandler.clearSecurityEvents();
  });

  describe('handleDatabaseError', () => {
    test('should return generic error message for database errors', () => {
      const dbError = new Error('Connection timeout');
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        user: { id: 'user123' }
      };

      const result = securityErrorHandler.handleDatabaseError(dbError, mockRequest);

      expect(result.status).toBe(500);
      expect(result.error).toBe('خطای داخلی سرور رخ داده است');
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    });

    test('should log security event for database errors', () => {
      const dbError = new Error('Database connection failed');
      const mockRequest = {
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Chrome/91.0'),
        user: { id: 'user456' }
      };

      securityErrorHandler.handleDatabaseError(dbError, mockRequest);

      const events = securityErrorHandler.getRecentSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('database_error');
      expect(events[0].ip_address).toBe('192.168.1.1');
      expect(events[0].user_id).toBe('user456');
    });
  });

  describe('handleValidationError', () => {
    test('should return validation error with field details', () => {
      const validationError = new Error('Phone number is required');
      validationError.field = 'phone';
      const mockRequest = { ip: '127.0.0.1', get: jest.fn() };

      const result = securityErrorHandler.handleValidationError(validationError, mockRequest);

      expect(result.status).toBe(400);
      expect(result.error).toBe('اطلاعات ارسالی نامعتبر است');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details.field).toBe('phone');
    });
  });

  describe('handleAuthenticationError', () => {
    test('should return generic authentication error', () => {
      const authError = new Error('Invalid credentials');
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
        body: { username: 'testuser' }
      };

      const result = securityErrorHandler.handleAuthenticationError(authError, mockRequest);

      expect(result.status).toBe(401);
      expect(result.error).toBe('احراز هویت ناموفق بود');
      expect(result.code).toBe('AUTHENTICATION_FAILED');
    });

    test('should log attempted username in security event', () => {
      const authError = new Error('Invalid password');
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
        body: { username: 'testuser' }
      };

      securityErrorHandler.handleAuthenticationError(authError, mockRequest);

      const events = securityErrorHandler.getRecentSecurityEvents();
      expect(events[0].attempted_user).toBe('testuser');
    });
  });

  describe('handleOTPError', () => {
    test('should return OTP error message', () => {
      const otpError = new Error('Invalid OTP');
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
        body: { phone: '09123456789' }
      };

      const result = securityErrorHandler.handleOTPError(otpError, mockRequest);

      expect(result.status).toBe(400);
      expect(result.error).toBe('کد تایید نامعتبر، منقضی شده یا قبلاً استفاده شده است');
      expect(result.code).toBe('INVALID_OTP');
    });

    test('should mask phone number in logs', () => {
      const otpError = new Error('OTP expired');
      const mockRequest = {
        ip: '127.0.0.1',
        get: jest.fn(),
        body: { phone: '09123456789' }
      };

      securityErrorHandler.handleOTPError(otpError, mockRequest);

      const events = securityErrorHandler.getRecentSecurityEvents();
      expect(events[0].phone).toBe('09****89');
    });
  });

  describe('handleJWTError', () => {
    test('should return JWT error message', () => {
      const jwtError = new Error('Token expired');
      jwtError.tokenType = 'access';
      const mockRequest = { ip: '127.0.0.1', get: jest.fn() };

      const result = securityErrorHandler.handleJWTError(jwtError, mockRequest);

      expect(result.status).toBe(403);
      expect(result.error).toBe('توکن نامعتبر یا منقضی شده است');
      expect(result.code).toBe('INVALID_TOKEN');
    });
  });

  describe('handleRateLimitError', () => {
    test('should return rate limit error with retry after', () => {
      const rateLimitError = new Error('Too many requests');
      const mockRequest = { ip: '127.0.0.1', get: jest.fn() };
      const retryAfter = 300;

      const result = securityErrorHandler.handleRateLimitError(rateLimitError, mockRequest, retryAfter);

      expect(result.status).toBe(429);
      expect(result.error).toBe('تعداد درخواست‌ها از حد مجاز فراتر رفته است');
      expect(result.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.retry_after).toBe(300);
    });
  });

  describe('sanitizeErrorForClient', () => {
    test('should remove sensitive information from error messages', () => {
      const error = new Error('Database password authentication failed at /home/user/app.js:123');
      
      const sanitized = securityErrorHandler.sanitizeErrorForClient(error);
      
      expect(sanitized.message).not.toContain('password');
      expect(sanitized.message).not.toContain('/home/user/app.js');
      expect(sanitized.message).toContain('[REDACTED]');
      expect(sanitized.message).toContain('[FILE_PATH]');
    });
  });

  describe('maskPhoneNumber', () => {
    test('should mask phone number correctly', () => {
      expect(securityErrorHandler.maskPhoneNumber('09123456789')).toBe('09****89');
      expect(securityErrorHandler.maskPhoneNumber('123')).toBe('****');
      expect(securityErrorHandler.maskPhoneNumber('')).toBe('****');
    });
  });

  describe('security event management', () => {
    test('should store and retrieve security events', () => {
      const error = new Error('Test error');
      const mockRequest = { ip: '127.0.0.1', get: jest.fn() };

      securityErrorHandler.handleGenericError(error, mockRequest);
      
      const events = securityErrorHandler.getRecentSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('generic_error');
    });

    test('should limit stored events to 1000', () => {
      const error = new Error('Test error');
      const mockRequest = { ip: '127.0.0.1', get: jest.fn() };

      // Add more than 1000 events
      for (let i = 0; i < 1005; i++) {
        securityErrorHandler.handleGenericError(error, mockRequest);
      }

      const events = securityErrorHandler.getRecentSecurityEvents(2000);
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });
});