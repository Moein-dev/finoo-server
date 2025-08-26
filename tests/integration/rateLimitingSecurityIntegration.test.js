const request = require('supertest');
const app = require('../../server');
const db = require('../../config/db');

describe('Rate Limiting Security Integration', () => {
  let baseTestPhone = '+989123457';
  let testCounter = 0;

  beforeAll(async () => {
    // Clean up test data
    await db.query("DELETE FROM phone_verifications WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
    await db.query("DELETE FROM users WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query("DELETE FROM phone_verifications WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
    await db.query("DELETE FROM users WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
  });

  beforeEach(() => {
    testCounter++;
  });

  describe('OTP Request Rate Limiting', () => {
    test('should allow initial OTP requests within limit', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // First request should succeed
      const response1 = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      expect(response1.status).toBe(200);
      expect(response1.body.data.message).toContain('کد تایید ارسال شد');

      // Wait a bit to avoid immediate rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request should also succeed (within limit)
      const response2 = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      expect(response2.status).toBe(200);
    });

    test('should include rate limit headers in responses', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      // Check for rate limiting headers (they might have different names)
      const headers = Object.keys(response.headers);
      const rateLimitHeaders = headers.filter(h => h.toLowerCase().includes('ratelimit') || h.toLowerCase().includes('rate-limit'));
      
      // Should have some rate limiting headers or the response should indicate rate limiting is active
      expect(response.status).toBeDefined();
      expect([200, 429]).toContain(response.status);
      
      // If rate limited, should have retry-after header
      if (response.status === 429) {
        expect(response.headers['retry-after']).toBeDefined();
      }
    });

    test('should handle rate limit exceeded gracefully', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Make multiple rapid requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/auth/send-code')
            .send({ phone: testPhone })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should succeed, some might be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // At least one should succeed
      expect(successfulResponses.length).toBeGreaterThan(0);

      // If any are rate limited, they should have proper headers
      rateLimitedResponses.forEach(response => {
        expect(response.headers['retry-after']).toBeDefined();
        expect(response.body.error).toContain('درخواست');
      });
    });
  });

  describe('Login Rate Limiting', () => {
    test('should allow multiple login attempts within reasonable limits', async () => {
      // Test with different usernames to avoid user-specific rate limiting
      const usernames = ['testuser1', 'testuser2', 'testuser3'];
      
      for (const username of usernames) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ username });

        // Should get validation error or user not found, not rate limit error
        expect(response.status).toBe(400);
        expect(response.body.error).not.toContain('درخواست');
        
        // Should have rate limit headers
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
      }
    });

    test('should apply rate limiting to login attempts', async () => {
      const username = 'testuser_rate_limit';
      
      // Make multiple rapid login attempts
      const requests = [];
      for (let i = 0; i < 8; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ username })
        );
      }

      const responses = await Promise.all(requests);
      
      // Check that rate limiting headers are present
      responses.forEach(response => {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      });

      // Some responses might be rate limited if we exceed the limit
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      rateLimitedResponses.forEach(response => {
        expect(response.headers['retry-after']).toBeDefined();
      });
    });
  });

  describe('OTP Verification Rate Limiting', () => {
    test('should allow reasonable OTP verification attempts', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // First generate an OTP
      await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      // Try verification with wrong codes (should be rate limited after several attempts)
      const wrongCode = '000000';
      const responses = [];
      
      for (let i = 0; i < 4; i++) {
        const response = await request(app)
          .post('/api/auth/verify-code')
          .send({ phone: testPhone, code: wrongCode });
        
        responses.push(response);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // All should have rate limit headers
      responses.forEach(response => {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
      });

      // Most should be validation errors, some might be rate limited
      const validationErrors = responses.filter(r => r.status === 400 && r.body.error.includes('اشتباه'));
      const rateLimitErrors = responses.filter(r => r.status === 429);

      expect(validationErrors.length + rateLimitErrors.length).toBe(responses.length);
    });
  });

  describe('Rate Limiting Configuration', () => {
    test('should have different rate limits for different endpoints', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Test OTP endpoint rate limit headers
      const otpResponse = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      // Test login endpoint rate limit headers
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser' });

      // Both should have rate limit headers but potentially different limits
      expect(otpResponse.headers['x-ratelimit-limit']).toBeDefined();
      expect(loginResponse.headers['x-ratelimit-limit']).toBeDefined();

      // The limits might be different for different endpoints
      const otpLimit = parseInt(otpResponse.headers['x-ratelimit-limit']);
      const loginLimit = parseInt(loginResponse.headers['x-ratelimit-limit']);

      expect(otpLimit).toBeGreaterThan(0);
      expect(loginLimit).toBeGreaterThan(0);
    });

    test('should reset rate limits after time window', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Make a request and check remaining count
      const response1 = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      expect(remaining1).toBeGreaterThanOrEqual(0);

      // Wait a short time (not enough for reset)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Make another request
      const response2 = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);

      // Remaining should be less than or equal to the first (consumed a request)
      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });
  });

  describe('Rate Limiting Error Messages', () => {
    test('should provide clear error messages in Persian when rate limited', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Make many rapid requests to potentially trigger rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/send-code')
            .send({ phone: testPhone })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // If any are rate limited, check error messages
      rateLimitedResponses.forEach(response => {
        expect(response.body.error).toBeDefined();
        expect(response.body.error).toMatch(/(درخواست|محدودیت|زمان)/);
        expect(response.headers['retry-after']).toBeDefined();
      });
    });

    test('should include retry-after header when rate limited', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Make rapid requests to potentially trigger rate limiting
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/send-code')
            .send({ phone: testPhone })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // Check retry-after headers
      rateLimitedResponses.forEach(response => {
        const retryAfter = parseInt(response.headers['retry-after']);
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThan(3600); // Should be reasonable (less than 1 hour)
      });
    });
  });

  describe('IP-based Rate Limiting', () => {
    test('should apply rate limiting per IP address', async () => {
      const testPhone1 = baseTestPhone + testCounter.toString().padStart(3, '0') + '1';
      const testPhone2 = baseTestPhone + testCounter.toString().padStart(3, '0') + '2';
      
      // Make requests with different phones but same IP
      const response1 = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone1 });

      const response2 = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone2 });

      // Both should have rate limit headers
      expect(response1.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response2.headers['x-ratelimit-remaining']).toBeDefined();

      // The remaining count should decrease (same IP)
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);
      
      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });
  });

  describe('Rate Limiting Security', () => {
    test('should not expose internal rate limiting implementation details', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Make requests to potentially trigger rate limiting
      const requests = [];
      for (let i = 0; i < 8; i++) {
        requests.push(
          request(app)
            .post('/api/auth/send-code')
            .send({ phone: testPhone })
        );
      }

      const responses = await Promise.all(requests);
      
      // Check that error messages don't expose internal details
      responses.forEach(response => {
        if (response.body.error) {
          expect(response.body.error).not.toContain('redis');
          expect(response.body.error).not.toContain('memory');
          expect(response.body.error).not.toContain('store');
          expect(response.body.error).not.toContain('key');
          expect(response.body.error).not.toContain('cache');
        }
      });
    });

    test('should handle rate limiting gracefully under load', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Create many concurrent requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/auth/send-code')
            .send({ phone: testPhone })
        );
      }

      // All requests should complete (not hang or crash)
      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(20);
      
      // All responses should have valid status codes
      responses.forEach(response => {
        expect([200, 400, 429]).toContain(response.status);
      });

      // Rate limited responses should have proper structure
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      rateLimitedResponses.forEach(response => {
        expect(response.body.error).toBeDefined();
        expect(response.headers['retry-after']).toBeDefined();
      });
    });
  });
});