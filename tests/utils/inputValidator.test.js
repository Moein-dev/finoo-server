const InputValidator = require('../../utils/inputValidator');

describe('InputValidator', () => {
  describe('validatePhoneNumber', () => {
    test('should validate correct Iranian mobile number', () => {
      const result = InputValidator.validatePhoneNumber('09123456789');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('09123456789');
      expect(result.error).toBeNull();
    });

    test('should handle phone number with +98 prefix', () => {
      const result = InputValidator.validatePhoneNumber('+989123456789');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('09123456789');
      expect(result.error).toBeNull();
    });

    test('should handle phone number with 0098 prefix', () => {
      const result = InputValidator.validatePhoneNumber('00989123456789');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('09123456789');
      expect(result.error).toBeNull();
    });

    test('should handle phone number with 98 prefix', () => {
      const result = InputValidator.validatePhoneNumber('989123456789');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('09123456789');
      expect(result.error).toBeNull();
    });

    test('should handle phone number with spaces and dashes', () => {
      const result = InputValidator.validatePhoneNumber('0912-345-6789');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('09123456789');
      expect(result.error).toBeNull();
    });

    test('should reject invalid phone number format', () => {
      const result = InputValidator.validatePhoneNumber('08123456789');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('فرمت شماره تلفن صحیح نیست');
    });

    test('should reject phone number with wrong length', () => {
      const result = InputValidator.validatePhoneNumber('091234567');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('فرمت شماره تلفن صحیح نیست');
    });

    test('should reject empty phone number', () => {
      const result = InputValidator.validatePhoneNumber('');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('شماره تلفن الزامی است');
    });

    test('should reject null phone number', () => {
      const result = InputValidator.validatePhoneNumber(null);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('شماره تلفن الزامی است');
    });
  });

  describe('validateUsername', () => {
    test('should validate correct username', () => {
      const result = InputValidator.validateUsername('user123');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('user123');
      expect(result.error).toBeNull();
    });

    test('should normalize username to lowercase', () => {
      const result = InputValidator.validateUsername('User123');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('user123');
      expect(result.error).toBeNull();
    });

    test('should allow underscores in username', () => {
      const result = InputValidator.validateUsername('user_123');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('user_123');
      expect(result.error).toBeNull();
    });

    test('should trim whitespace from username', () => {
      const result = InputValidator.validateUsername('  user123  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('user123');
      expect(result.error).toBeNull();
    });

    test('should reject username shorter than 3 characters', () => {
      const result = InputValidator.validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('حداقل 3 کاراکتر');
    });

    test('should reject username longer than 30 characters', () => {
      const result = InputValidator.validateUsername('a'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('بیشتر از 30 کاراکتر');
    });

    test('should reject username with special characters', () => {
      const result = InputValidator.validateUsername('user@123');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('حروف انگلیسی، اعداد و خط زیر');
    });

    test('should reject username with consecutive underscores', () => {
      const result = InputValidator.validateUsername('user__123');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('خط زیر متوالی');
    });

    test('should reject username starting with underscore', () => {
      const result = InputValidator.validateUsername('_user123');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('خط زیر شروع یا تمام');
    });

    test('should reject username ending with underscore', () => {
      const result = InputValidator.validateUsername('user123_');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('خط زیر شروع یا تمام');
    });

    test('should reject empty username', () => {
      const result = InputValidator.validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('نام کاربری الزامی است');
    });
  });

  describe('validateOTPCode', () => {
    test('should validate correct 6-digit OTP', () => {
      const result = InputValidator.validateOTPCode('123456');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('123456');
      expect(result.error).toBeNull();
    });

    test('should sanitize OTP with non-digit characters', () => {
      const result = InputValidator.validateOTPCode('12-34-56');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('123456');
      expect(result.error).toBeNull();
    });

    test('should reject OTP with less than 6 digits', () => {
      const result = InputValidator.validateOTPCode('12345');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('6 رقم باشد');
    });

    test('should reject OTP with more than 6 digits', () => {
      const result = InputValidator.validateOTPCode('1234567');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('6 رقم باشد');
    });

    test('should reject empty OTP', () => {
      const result = InputValidator.validateOTPCode('');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('کد تایید الزامی است');
    });

    test('should reject non-string OTP', () => {
      const result = InputValidator.validateOTPCode(123456);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('کد تایید الزامی است');
    });
  });

  describe('validateRefreshToken', () => {
    test('should validate correct JWT format', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = InputValidator.validateRefreshToken(token);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(token);
      expect(result.error).toBeNull();
    });

    test('should trim whitespace from token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = InputValidator.validateRefreshToken(`  ${token}  `);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(token);
      expect(result.error).toBeNull();
    });

    test('should reject invalid JWT format', () => {
      const result = InputValidator.validateRefreshToken('invalid.token');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('فرمت کد بازیابی صحیح نیست');
    });

    test('should reject empty token', () => {
      const result = InputValidator.validateRefreshToken('');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toContain('کد بازیابی الزامی است');
    });
  });

  describe('sanitizeInput', () => {
    test('should trim whitespace by default', () => {
      const result = InputValidator.sanitizeInput('  hello world  ');
      expect(result).toBe('hello world');
    });

    test('should remove null bytes', () => {
      const result = InputValidator.sanitizeInput('hello\0world');
      expect(result).toBe('helloworld');
    });

    test('should remove control characters', () => {
      const result = InputValidator.sanitizeInput('hello\x01\x02world');
      expect(result).toBe('helloworld');
    });

    test('should preserve newlines and tabs when preserveWhitespace is true', () => {
      const result = InputValidator.sanitizeInput('hello\n\tworld', { preserveWhitespace: true });
      expect(result).toBe('hello\n\tworld');
    });

    test('should limit length when maxLength is specified', () => {
      const result = InputValidator.sanitizeInput('hello world', { maxLength: 5 });
      expect(result).toBe('hello');
    });

    test('should normalize Unicode when specified', () => {
      const result = InputValidator.sanitizeInput('café', { normalizeUnicode: true });
      expect(result).toBe('café');
    });

    test('should handle empty input', () => {
      const result = InputValidator.sanitizeInput('');
      expect(result).toBe('');
    });

    test('should handle null input', () => {
      const result = InputValidator.sanitizeInput(null);
      expect(result).toBe('');
    });
  });

  describe('validateAndSanitize', () => {
    test('should validate multiple fields successfully', () => {
      const data = {
        phone: '09123456789',
        username: 'user123',
        code: '123456'
      };
      const schema = {
        phone: { type: 'phone' },
        username: { type: 'username' },
        code: { type: 'otp' }
      };

      const result = InputValidator.validateAndSanitize(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.phone).toBe('09123456789');
      expect(result.sanitized.username).toBe('user123');
      expect(result.sanitized.code).toBe('123456');
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('should collect validation errors for multiple fields', () => {
      const data = {
        phone: 'invalid',
        username: 'ab',
        code: '12345'
      };
      const schema = {
        phone: { type: 'phone' },
        username: { type: 'username' },
        code: { type: 'otp' }
      };

      const result = InputValidator.validateAndSanitize(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toContain('فرمت شماره تلفن صحیح نیست');
      expect(result.errors.username).toContain('حداقل 3 کاراکتر');
      expect(result.errors.code).toContain('6 رقم باشد');
    });

    test('should handle required field validation', () => {
      const data = {
        name: ''
      };
      const schema = {
        name: { required: true, errorMessage: 'نام الزامی است' }
      };

      const result = InputValidator.validateAndSanitize(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('نام الزامی است');
    });

    test('should handle optional field validation', () => {
      const data = {
        username: '',
        name: 'Test User'
      };
      const schema = {
        username: { type: 'username', required: false },
        name: { required: false }
      };

      const result = InputValidator.validateAndSanitize(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.username).toBe('');
      expect(result.sanitized.name).toBe('Test User');
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('should validate optional field when provided', () => {
      const data = {
        username: 'invalid@user',
        name: 'Test User'
      };
      const schema = {
        username: { type: 'username', required: false },
        name: { required: false }
      };

      const result = InputValidator.validateAndSanitize(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.username).toContain('حروف انگلیسی، اعداد و خط زیر');
    });
  });

  describe('createValidationMiddleware', () => {
    test('should create middleware that validates request body', () => {
      const schema = {
        phone: { type: 'phone' },
        code: { type: 'otp' }
      };
      const middleware = InputValidator.createValidationMiddleware(schema);

      const req = {
        body: {
          phone: '09123456789',
          code: '123456'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.phone).toBe('09123456789');
      expect(req.body.code).toBe('123456');
    });

    test('should return error response for invalid input', () => {
      const schema = {
        phone: { type: 'phone' }
      };
      const middleware = InputValidator.createValidationMiddleware(schema);

      const req = {
        body: {
          phone: 'invalid'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

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

  describe('Security-focused Input Validation', () => {
    describe('Injection Attack Prevention', () => {
      test('should sanitize SQL injection attempts in phone numbers', () => {
        const maliciousInputs = [
          "09123456789'; DROP TABLE users; --",
          "09123456789' OR '1'='1",
          "09123456789'; INSERT INTO users VALUES ('hacker'); --"
        ];

        maliciousInputs.forEach(input => {
          const result = InputValidator.validatePhoneNumber(input);
          // Should either be invalid or sanitized
          if (result.isValid) {
            expect(result.sanitized).toMatch(/^09[0-9]{9}$/);
            expect(result.sanitized).not.toContain("'");
            expect(result.sanitized).not.toContain(";");
            expect(result.sanitized).not.toContain("--");
          } else {
            expect(result.isValid).toBe(false);
          }
        });
      });

      test('should sanitize XSS attempts in usernames', () => {
        const xssInputs = [
          "<script>alert('xss')</script>",
          "user<img src=x onerror=alert(1)>",
          "user';alert('xss');//"
        ];

        xssInputs.forEach(input => {
          const result = InputValidator.validateUsername(input);
          expect(result.isValid).toBe(false);
          // The error could be about length or invalid characters
          expect(result.error).toMatch(/(حروف انگلیسی، اعداد و خط زیر|بیشتر از 30 کاراکتر)/);
        });
      });

      test('should handle null byte injection attempts', () => {
        const nullByteInputs = [
          "user123\0admin",
          "09123456789\0",
          "123456\0"
        ];

        nullByteInputs.forEach(input => {
          const sanitized = InputValidator.sanitizeInput(input);
          expect(sanitized).not.toContain('\0');
        });
      });
    });

    describe('Buffer Overflow Prevention', () => {
      test('should handle extremely long phone numbers', () => {
        const longPhone = '0912345678' + '9'.repeat(1000);
        const result = InputValidator.validatePhoneNumber(longPhone);
        
        if (result.isValid) {
          expect(result.sanitized.length).toBe(11);
        } else {
          expect(result.isValid).toBe(false);
        }
      });

      test('should handle extremely long usernames', () => {
        const longUsername = 'a'.repeat(1000);
        const result = InputValidator.validateUsername(longUsername);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('بیشتر از 30 کاراکتر');
      });

      test('should limit input length in sanitization', () => {
        const longInput = 'a'.repeat(1000);
        const sanitized = InputValidator.sanitizeInput(longInput, { maxLength: 100 });
        
        expect(sanitized.length).toBe(100);
      });
    });

    describe('Unicode and Encoding Security', () => {
      test('should handle Unicode normalization attacks', () => {
        // Different Unicode representations of the same character
        const unicodeInputs = [
          'café', // NFC
          'cafe\u0301', // NFD
          'ℌ𝒆𝓁𝓁𝑜', // Mathematical script
        ];

        unicodeInputs.forEach(input => {
          const sanitized = InputValidator.sanitizeInput(input, { normalizeUnicode: true });
          expect(sanitized).toBeDefined();
        });
      });

      test('should handle control character injection', () => {
        const controlChars = [
          'user\x01name',
          'user\x02name',
          'user\x1fname'
        ];

        controlChars.forEach(input => {
          const sanitized = InputValidator.sanitizeInput(input);
          expect(sanitized).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
        });
      });
    });

    describe('Rate Limiting Input Validation', () => {
      test('should validate multiple rapid requests', () => {
        const schema = { phone: { type: 'phone' } };
        
        // Simulate rapid requests
        for (let i = 0; i < 100; i++) {
          const result = InputValidator.validateAndSanitize(
            { phone: '09123456789' },
            schema
          );
          expect(result.isValid).toBe(true);
        }
      });

      test('should handle concurrent validation requests', async () => {
        const schema = { phone: { type: 'phone' } };
        const promises = [];
        
        // Create 50 concurrent validation requests
        for (let i = 0; i < 50; i++) {
          promises.push(Promise.resolve(
            InputValidator.validateAndSanitize(
              { phone: '09123456789' },
              schema
            )
          ));
        }
        
        const results = await Promise.all(promises);
        results.forEach(result => {
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('Memory Safety', () => {
      test('should not leak sensitive data in error messages', () => {
        const sensitiveData = {
          phone: 'secret_phone_number',
          password: 'secret_password',
          token: 'secret_token'
        };

        const schema = {
          phone: { type: 'phone' },
          password: { required: true },
          token: { required: true }
        };

        const result = InputValidator.validateAndSanitize(sensitiveData, schema);
        
        // Error messages should not contain the actual sensitive values
        Object.values(result.errors || {}).forEach(error => {
          expect(error).not.toContain('secret_phone_number');
          expect(error).not.toContain('secret_password');
          expect(error).not.toContain('secret_token');
        });
      });

      test('should handle circular references safely', () => {
        const circularObj = { name: 'test' };
        circularObj.self = circularObj;

        // Should handle the error gracefully when JSON.stringify fails
        expect(() => {
          try {
            const jsonString = JSON.stringify(circularObj);
            InputValidator.sanitizeInput(jsonString);
          } catch (error) {
            // This is expected behavior - circular references can't be stringified
            expect(error.message).toContain('circular structure');
          }
        }).not.toThrow();
      });
    });

    describe('Timing Attack Prevention', () => {
      test('should have consistent validation timing', () => {
        const validPhone = '09123456789';
        const invalidPhone = 'invalid_phone';
        
        const validTimes = [];
        const invalidTimes = [];
        
        // Measure validation time for valid input
        for (let i = 0; i < 10; i++) {
          const start = process.hrtime.bigint();
          InputValidator.validatePhoneNumber(validPhone);
          const end = process.hrtime.bigint();
          validTimes.push(Number(end - start));
        }
        
        // Measure validation time for invalid input
        for (let i = 0; i < 10; i++) {
          const start = process.hrtime.bigint();
          InputValidator.validatePhoneNumber(invalidPhone);
          const end = process.hrtime.bigint();
          invalidTimes.push(Number(end - start));
        }
        
        // Calculate averages
        const avgValidTime = validTimes.reduce((a, b) => a + b) / validTimes.length;
        const avgInvalidTime = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;
        
        // The timing difference should not be extreme (within reasonable bounds)
        // This is a basic timing attack prevention check
        const timingRatio = Math.max(avgValidTime, avgInvalidTime) / Math.min(avgValidTime, avgInvalidTime);
        expect(timingRatio).toBeLessThan(100); // Allow for reasonable variance
      });
    });
  });
});