const InputValidator = require('../../utils/inputValidator');

describe('Input Validation Middleware Integration', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Login validation middleware', () => {
    const loginSchema = {
      username: { type: 'username' }
    };

    test('should pass valid username through middleware', () => {
      req.body = { username: 'validuser123' };
      const middleware = InputValidator.createValidationMiddleware(loginSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('validuser123');
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should normalize username to lowercase', () => {
      req.body = { username: 'ValidUser123' };
      const middleware = InputValidator.createValidationMiddleware(loginSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('validuser123');
    });

    test('should reject invalid username', () => {
      req.body = { username: 'invalid@user' };
      const middleware = InputValidator.createValidationMiddleware(loginSchema);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        error: "ورودی نامعتبر",
        details: expect.objectContaining({
          username: expect.stringContaining('حروف انگلیسی، اعداد و خط زیر')
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('OTP request validation middleware', () => {
    const otpRequestSchema = {
      phone: { type: 'phone' }
    };

    test('should pass valid phone number through middleware', () => {
      req.body = { phone: '09123456789' };
      const middleware = InputValidator.createValidationMiddleware(otpRequestSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.phone).toBe('09123456789');
    });

    test('should sanitize phone number with +98 prefix', () => {
      req.body = { phone: '+989123456789' };
      const middleware = InputValidator.createValidationMiddleware(otpRequestSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.phone).toBe('09123456789');
    });

    test('should reject invalid phone number', () => {
      req.body = { phone: '08123456789' };
      const middleware = InputValidator.createValidationMiddleware(otpRequestSchema);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        error: "ورودی نامعتبر",
        details: expect.objectContaining({
          phone: expect.stringContaining('فرمت شماره تلفن صحیح نیست')
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('OTP verification validation middleware', () => {
    const otpVerifySchema = {
      phone: { type: 'phone' },
      code: { type: 'otp' }
    };

    test('should pass valid phone and OTP through middleware', () => {
      req.body = { phone: '09123456789', code: '123456' };
      const middleware = InputValidator.createValidationMiddleware(otpVerifySchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.phone).toBe('09123456789');
      expect(req.body.code).toBe('123456');
    });

    test('should sanitize OTP with non-digit characters', () => {
      req.body = { phone: '09123456789', code: '12-34-56' };
      const middleware = InputValidator.createValidationMiddleware(otpVerifySchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.code).toBe('123456');
    });

    test('should reject invalid OTP length', () => {
      req.body = { phone: '09123456789', code: '12345' };
      const middleware = InputValidator.createValidationMiddleware(otpVerifySchema);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        error: "ورودی نامعتبر",
        details: expect.objectContaining({
          code: expect.stringContaining('6 رقم باشد')
        })
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should collect multiple validation errors', () => {
      req.body = { phone: 'invalid', code: '12345' };
      const middleware = InputValidator.createValidationMiddleware(otpVerifySchema);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        error: "ورودی نامعتبر",
        details: expect.objectContaining({
          phone: expect.stringContaining('فرمت شماره تلفن صحیح نیست'),
          code: expect.stringContaining('6 رقم باشد')
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Register validation middleware', () => {
    const registerSchema = {
      username: { 
        type: 'username',
        required: false
      },
      name: {
        required: false
      }
    };

    test('should pass valid registration data through middleware', () => {
      req.body = { username: 'newuser123', name: 'Test User' };
      const middleware = InputValidator.createValidationMiddleware(registerSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('newuser123');
      expect(req.body.name).toBe('Test User');
    });

    test('should allow registration without username', () => {
      req.body = { name: 'Test User' };
      const middleware = InputValidator.createValidationMiddleware(registerSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.name).toBe('Test User');
    });

    test('should allow registration without name', () => {
      req.body = { username: 'newuser123' };
      const middleware = InputValidator.createValidationMiddleware(registerSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('newuser123');
    });

    test('should reject invalid username when provided', () => {
      req.body = { username: 'invalid@user', name: 'Test User' };
      const middleware = InputValidator.createValidationMiddleware(registerSchema);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        error: "ورودی نامعتبر",
        details: expect.objectContaining({
          username: expect.stringContaining('حروف انگلیسی، اعداد و خط زیر')
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Refresh token validation middleware', () => {
    const refreshTokenSchema = {
      refreshToken: { type: 'refreshToken' }
    };

    test('should pass valid JWT format through middleware', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      req.body = { refreshToken: validJWT };
      const middleware = InputValidator.createValidationMiddleware(refreshTokenSchema);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.body.refreshToken).toBe(validJWT);
    });

    test('should reject invalid JWT format', () => {
      req.body = { refreshToken: 'invalid.token' };
      const middleware = InputValidator.createValidationMiddleware(refreshTokenSchema);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        error: "ورودی نامعتبر",
        details: expect.objectContaining({
          refreshToken: expect.stringContaining('فرمت کد بازیابی صحیح نیست')
        })
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});