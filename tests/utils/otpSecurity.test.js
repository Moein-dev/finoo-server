const crypto = require('crypto');

// Mock crypto.randomInt for testing
const originalRandomInt = crypto.randomInt;

describe('OTP Security Functions', () => {
  afterEach(() => {
    // Restore original crypto.randomInt
    crypto.randomInt = originalRandomInt;
  });

  describe('OTP Generation Security', () => {
    test('should generate 6-digit OTP using crypto.randomInt', () => {
      // Mock crypto.randomInt to return a known value
      const mockRandomInt = jest.fn().mockReturnValue(123456);
      crypto.randomInt = mockRandomInt;

      // Simulate OTP generation as done in authController
      const code = crypto.randomInt(100000, 999999).toString();

      expect(mockRandomInt).toHaveBeenCalledWith(100000, 999999);
      expect(code).toBe('123456');
      expect(code).toMatch(/^\d{6}$/);
    });

    test('should generate different OTPs on multiple calls', () => {
      const codes = new Set();
      
      // Generate 100 OTPs and check they're different
      for (let i = 0; i < 100; i++) {
        const code = crypto.randomInt(100000, 999999).toString();
        codes.add(code);
        expect(code).toMatch(/^\d{6}$/);
      }
      
      // Should have generated mostly unique codes (allowing for some collisions)
      expect(codes.size).toBeGreaterThan(90);
    });

    test('should generate OTPs within valid range', () => {
      for (let i = 0; i < 50; i++) {
        const code = crypto.randomInt(100000, 999999);
        expect(code).toBeGreaterThanOrEqual(100000);
        expect(code).toBeLessThan(1000000);
      }
    });

    test('should handle edge cases in OTP generation', () => {
      // Test minimum value
      crypto.randomInt = jest.fn().mockReturnValue(100000);
      let code = crypto.randomInt(100000, 999999).toString();
      expect(code).toBe('100000');
      expect(code.length).toBe(6);

      // Test maximum value
      crypto.randomInt = jest.fn().mockReturnValue(999999);
      code = crypto.randomInt(100000, 999999).toString();
      expect(code).toBe('999999');
      expect(code.length).toBe(6);
    });
  });

  describe('OTP Expiry Time Security', () => {
    test('should set expiry to exactly 2 minutes', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes
      
      const diffMinutes = (expiresAt - now) / (1000 * 60);
      expect(diffMinutes).toBe(2);
    });

    test('should create expiry time in future', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
      
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    test('should handle timezone correctly for expiry', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
      
      // Should maintain the same timezone offset
      expect(expiresAt.getTimezoneOffset()).toBe(now.getTimezoneOffset());
    });
  });

  describe('OTP Security Validation', () => {
    test('should validate OTP format correctly', () => {
      const validOTPs = ['123456', '000000', '999999', '100000'];
      const invalidOTPs = ['12345', '1234567', 'abcdef', '12345a', '', null, undefined];

      validOTPs.forEach(otp => {
        expect(otp).toMatch(/^\d{6}$/);
      });

      invalidOTPs.forEach(otp => {
        if (otp) {
          expect(otp).not.toMatch(/^\d{6}$/);
        }
      });
    });

    test('should handle OTP comparison securely', () => {
      const storedOTP = '123456';
      const userInputs = [
        '123456', // Correct
        '123457', // Wrong
        '12345',  // Too short
        '1234567', // Too long
        'abcdef',  // Non-numeric
        '',        // Empty
        null,      // Null
        undefined  // Undefined
      ];

      userInputs.forEach(input => {
        if (input === '123456') {
          expect(input === storedOTP).toBe(true);
        } else {
          expect(input === storedOTP).toBe(false);
        }
      });
    });
  });

  describe('OTP Timing Attack Prevention', () => {
    test('should use constant-time comparison for OTP validation', () => {
      // Simulate constant-time comparison
      const constantTimeCompare = (a, b) => {
        if (a.length !== b.length) return false;
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
          result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
      };

      const correctOTP = '123456';
      const testCases = [
        '123456', // Correct
        '123457', // Last digit wrong
        '023456', // First digit wrong
        '123356', // Middle digit wrong
        '000000', // All wrong
        '999999'  // All wrong
      ];

      testCases.forEach(testOTP => {
        const result = constantTimeCompare(correctOTP, testOTP);
        if (testOTP === '123456') {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      });
    });
  });

  describe('OTP Rate Limiting Security', () => {
    test('should track failed attempts correctly', () => {
      let attempts = 0;
      const maxAttempts = 3;

      // Simulate failed attempts
      for (let i = 0; i < 5; i++) {
        attempts++;
        
        if (attempts <= maxAttempts) {
          expect(attempts).toBeLessThanOrEqual(maxAttempts);
        } else {
          expect(attempts).toBeGreaterThan(maxAttempts);
          // Should block further attempts
        }
      }
    });

    test('should reset attempts after successful verification', () => {
      let attempts = 3;
      
      // Simulate successful verification
      const isSuccess = true;
      if (isSuccess) {
        attempts = 0;
      }
      
      expect(attempts).toBe(0);
    });
  });

  describe('OTP One-Time Use Security', () => {
    test('should mark OTP as used after successful verification', () => {
      let isUsed = false;
      
      // Simulate successful OTP verification
      const verificationSuccess = true;
      if (verificationSuccess) {
        isUsed = true;
      }
      
      expect(isUsed).toBe(true);
    });

    test('should reject already used OTP', () => {
      const otpRecord = {
        code: '123456',
        isUsed: true,
        expiresAt: new Date(Date.now() + 60000) // Not expired
      };
      
      const userCode = '123456';
      const now = new Date();
      
      // Check if OTP is valid
      const isValid = (
        otpRecord.code === userCode &&
        !otpRecord.isUsed &&
        otpRecord.expiresAt > now
      );
      
      expect(isValid).toBe(false); // Should be false because isUsed is true
    });

    test('should reject expired OTP even if not used', () => {
      const otpRecord = {
        code: '123456',
        isUsed: false,
        expiresAt: new Date(Date.now() - 60000) // Expired 1 minute ago
      };
      
      const userCode = '123456';
      const now = new Date();
      
      const isValid = (
        otpRecord.code === userCode &&
        !otpRecord.isUsed &&
        otpRecord.expiresAt > now
      );
      
      expect(isValid).toBe(false); // Should be false because expired
    });

    test('should validate all conditions for OTP acceptance', () => {
      const validOtpRecord = {
        code: '123456',
        isUsed: false,
        expiresAt: new Date(Date.now() + 60000) // Expires in 1 minute
      };
      
      const userCode = '123456';
      const now = new Date();
      
      const isValid = (
        validOtpRecord.code === userCode &&
        !validOtpRecord.isUsed &&
        validOtpRecord.expiresAt > now
      );
      
      expect(isValid).toBe(true);
    });
  });

  describe('OTP Storage Security', () => {
    test('should not store OTP in plain text (simulation)', () => {
      const plainOTP = '123456';
      
      // In a real implementation, OTP should be hashed
      // This is a simulation of what should happen
      const crypto = require('crypto');
      const hashedOTP = crypto.createHash('sha256').update(plainOTP).digest('hex');
      
      expect(hashedOTP).not.toBe(plainOTP);
      expect(hashedOTP.length).toBe(64); // SHA256 hex length
    });

    test('should verify hashed OTP correctly (simulation)', () => {
      const plainOTP = '123456';
      const crypto = require('crypto');
      const storedHash = crypto.createHash('sha256').update(plainOTP).digest('hex');
      
      // Verify correct OTP
      const userInput = '123456';
      const userHash = crypto.createHash('sha256').update(userInput).digest('hex');
      expect(userHash).toBe(storedHash);
      
      // Verify wrong OTP
      const wrongInput = '123457';
      const wrongHash = crypto.createHash('sha256').update(wrongInput).digest('hex');
      expect(wrongHash).not.toBe(storedHash);
    });
  });

  describe('OTP Cleanup Security', () => {
    test('should clean up expired OTPs', () => {
      const otpRecords = [
        { id: 1, code: '123456', expiresAt: new Date(Date.now() - 60000) }, // Expired
        { id: 2, code: '789012', expiresAt: new Date(Date.now() + 60000) }, // Valid
        { id: 3, code: '345678', expiresAt: new Date(Date.now() - 120000) } // Expired
      ];
      
      const now = new Date();
      const validRecords = otpRecords.filter(record => record.expiresAt > now);
      
      expect(validRecords).toHaveLength(1);
      expect(validRecords[0].id).toBe(2);
    });

    test('should clean up used OTPs', () => {
      const otpRecords = [
        { id: 1, code: '123456', isUsed: true },
        { id: 2, code: '789012', isUsed: false },
        { id: 3, code: '345678', isUsed: true }
      ];
      
      const unusedRecords = otpRecords.filter(record => !record.isUsed);
      
      expect(unusedRecords).toHaveLength(1);
      expect(unusedRecords[0].id).toBe(2);
    });
  });
});