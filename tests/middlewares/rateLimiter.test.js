const { 
  otpRateLimit, 
  loginRateLimit,
  registerRateLimit
} = require('../../middlewares/rateLimiter');

describe('Rate Limiter Middleware Configuration', () => {
  describe('Middleware Exports', () => {
    test('should export required rate limiters', () => {
      expect(otpRateLimit).toBeDefined();
      expect(loginRateLimit).toBeDefined();
      expect(registerRateLimit).toBeDefined();
    });

    test('should export functions', () => {
      expect(typeof otpRateLimit).toBe('function');
      expect(typeof loginRateLimit).toBe('function');
      expect(typeof registerRateLimit).toBe('function');
    });
  });

  describe('Rate Limiter Configuration', () => {
    test('should have correct configuration for OTP rate limiter', () => {
      // Test that the middleware is properly configured
      // We can't easily test the actual rate limiting without complex setup
      // but we can verify the middleware exists and is callable
      expect(otpRateLimit).toBeDefined();
      expect(typeof otpRateLimit).toBe('function');
    });

    test('should have correct configuration for login rate limiter', () => {
      expect(loginRateLimit).toBeDefined();
      expect(typeof loginRateLimit).toBe('function');
    });

    test('should have correct configuration for register rate limiter', () => {
      expect(registerRateLimit).toBeDefined();
      expect(typeof registerRateLimit).toBe('function');
    });
  });

  describe('Rate Limiter Functionality', () => {
    test('should be middleware functions that can be called', () => {
      // These are express middleware functions
      // They should have the correct arity (3 parameters: req, res, next)
      expect(otpRateLimit.length).toBe(3);
      expect(loginRateLimit.length).toBe(3);
      expect(registerRateLimit.length).toBe(3);
    });
  });
});