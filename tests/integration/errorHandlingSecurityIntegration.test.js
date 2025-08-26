const request = require('supertest');
const app = require('../../server');
const db = require('../../config/db');

describe('Error Handling Security Integration', () => {
  let baseTestPhone = '+989123458';
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

  describe('Authentication Error Handling', () => {
    test('should handle invalid username gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent_user_12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).not.toContain('mysql');
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('table');
      expect(response.body.error).not.toContain('SELECT');
      expect(response.body.error).not.toContain('WHERE');
      
      // Should be a generic error message in Persian
      expect(response.body.error).toMatch(/(نام کاربری|صحیح نیست|یافت نشد)/);
    });

    test('should handle database connection errors gracefully', async () => {
      // This test simulates what should happen if database is unavailable
      // The actual error handling is tested by checking response structure
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser' });

      // Should have proper error structure
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      
      // Should not expose internal details
      expect(response.body.error).not.toContain('ECONNREFUSED');
      expect(response.body.error).not.toContain('ETIMEDOUT');
      expect(response.body.error).not.toContain('connection');
      expect(response.body.error).not.toContain('host');
      expect(response.body.error).not.toContain('port');
    });

    test('should handle OTP verification errors securely', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Try to verify OTP without requesting one first
      const response = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      
      // Should not expose database structure or internal logic
      expect(response.body.error).not.toContain('phone_verifications');
      expect(response.body.error).not.toContain('user_id');
      expect(response.body.error).not.toContain('expires_at');
      expect(response.body.error).not.toContain('is_used');
      expect(response.body.error).not.toContain('NULL');
      expect(response.body.error).not.toContain('JOIN');
    });

    test('should handle JWT token errors securely', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        'malformed_token',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: token });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        
        // Should not expose JWT implementation details
        expect(response.body.error).not.toContain('jsonwebtoken');
        expect(response.body.error).not.toContain('jwt malformed');
        expect(response.body.error).not.toContain('invalid signature');
        expect(response.body.error).not.toContain('secret');
        expect(response.body.error).not.toContain('algorithm');
        
        // Should be generic error in Persian
        expect(response.body.error).toMatch(/(نامعتبر|منقضی|بازیابی)/);
      }
    });
  });

  describe('Input Validation Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"username": "test", invalid json}');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      
      // Should not expose JSON parsing details
      expect(response.body.error).not.toContain('SyntaxError');
      expect(response.body.error).not.toContain('JSON.parse');
      expect(response.body.error).not.toContain('Unexpected token');
      expect(response.body.error).not.toContain('position');
    });

    test('should handle missing required fields gracefully', async () => {
      const endpoints = [
        { path: '/api/auth/login', body: {} },
        { path: '/api/auth/send-code', body: {} },
        { path: '/api/auth/verify-code', body: {} },
        { path: '/api/auth/refresh', body: {} },
        { path: '/api/auth/logout', body: {} }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint.path)
          .send(endpoint.body);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error).toMatch(/(الزامی|مورد نیاز|ورودی نامعتبر)/);
        
        // Should have proper error structure
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe(400);
      }
    });

    test('should handle SQL injection attempts in inputs', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker'); --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1 --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ username: maliciousInput });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        
        // Should not execute SQL or expose database errors
        expect(response.body.error).not.toContain('mysql');
        expect(response.body.error).not.toContain('syntax error');
        expect(response.body.error).not.toContain('table');
        expect(response.body.error).not.toContain('column');
        
        // Should be validation error
        expect(response.body.error).toMatch(/(ورودی نامعتبر|نام کاربری)/);
      }
    });

    test('should handle XSS attempts in inputs', async () => {
      const xssInputs = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert('xss')",
        "<svg onload=alert(1)>",
        "';alert('xss');//"
      ];

      for (const xssInput of xssInputs) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ username: xssInput });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        
        // Response should not contain the malicious script
        expect(JSON.stringify(response.body)).not.toContain('<script>');
        expect(JSON.stringify(response.body)).not.toContain('javascript:');
        expect(JSON.stringify(response.body)).not.toContain('onerror');
        expect(JSON.stringify(response.body)).not.toContain('onload');
        
        // Should be validation error
        expect(response.body.error).toMatch(/(ورودی نامعتبر|نام کاربری)/);
      }
    });
  });

  describe('System Error Handling', () => {
    test('should handle large request payloads gracefully', async () => {
      const largePayload = {
        username: 'a'.repeat(100000),
        phone: '09123456789' + 'x'.repeat(100000),
        extraData: 'x'.repeat(100000)
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(largePayload);

      // Should handle gracefully, not crash
      expect(response.status).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      if (response.body.error) {
        expect(response.body.error).not.toContain('PayloadTooLargeError');
        expect(response.body.error).not.toContain('request entity too large');
      }
    });

    test('should handle concurrent error scenarios', async () => {
      const requests = [];
      
      // Create multiple concurrent requests with various error conditions
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: `nonexistent_user_${i}` })
        );
      }

      const responses = await Promise.all(requests);
      
      // All should complete without hanging
      expect(responses).toHaveLength(10);
      
      // All should have proper error handling
      responses.forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error).not.toContain('mysql');
        expect(response.body.error).not.toContain('database');
      });
    });

    test('should handle memory exhaustion gracefully', async () => {
      // Test with deeply nested objects that could cause memory issues
      const deepObject = {};
      let current = deepObject;
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.username = 'test';

      const response = await request(app)
        .post('/api/auth/login')
        .send(deepObject);

      // Should handle gracefully
      expect(response.status).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Security Event Logging', () => {
    test('should not expose sensitive data in error logs', async () => {
      const sensitiveData = {
        username: 'admin',
        password: 'secret_password_123',
        token: 'secret_token_456',
        apiKey: 'secret_api_key_789'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(sensitiveData);

      expect(response.status).toBe(400);
      
      // Error response should not contain sensitive data
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('secret_password_123');
      expect(responseString).not.toContain('secret_token_456');
      expect(responseString).not.toContain('secret_api_key_789');
    });

    test('should handle authentication failures without information disclosure', async () => {
      const testCases = [
        { username: 'admin', expectedError: /نام کاربری/ },
        { username: 'root', expectedError: /نام کاربری/ },
        { username: 'administrator', expectedError: /نام کاربری/ },
        { username: 'user123', expectedError: /نام کاربری/ }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ username: testCase.username });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(testCase.expectedError);
        
        // Should not indicate whether user exists or not
        expect(response.body.error).not.toContain('exists');
        expect(response.body.error).not.toContain('found');
        expect(response.body.error).not.toContain('registered');
      }
    });
  });

  describe('Error Response Consistency', () => {
    test('should have consistent error response format across all endpoints', async () => {
      const endpoints = [
        { path: '/api/auth/login', body: { username: 'invalid_user' } },
        { path: '/api/auth/send-code', body: { phone: 'invalid_phone' } },
        { path: '/api/auth/verify-code', body: { phone: 'invalid', code: 'invalid' } },
        { path: '/api/auth/refresh', body: { refreshToken: 'invalid' } },
        { path: '/api/auth/logout', body: { refreshToken: 'invalid' } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint.path)
          .send(endpoint.body);

        expect(response.status).toBeGreaterThanOrEqual(400);
        
        // Should have consistent error structure
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.status).toBe('number');
        expect(typeof response.body.error).toBe('string');
        
        // Should not have stack traces or internal details
        expect(response.body).not.toHaveProperty('stack');
        expect(response.body).not.toHaveProperty('trace');
        expect(response.body).not.toHaveProperty('internal');
      }
    });

    test('should maintain security headers even in error responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent' });

      expect(response.status).toBe(400);
      
      // Should still have security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['cache-control']).toContain('no-store');
    });

    test('should handle edge case error scenarios', async () => {
      const edgeCases = [
        { body: null },
        { body: undefined },
        { body: '' },
        { body: [] },
        { body: 123 },
        { body: true }
      ];

      for (const testCase of edgeCases) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(testCase.body);

        // Should handle gracefully without crashing
        expect(response.status).toBeDefined();
        expect(response.status).toBeGreaterThanOrEqual(400);
        
        if (response.body && response.body.error) {
          expect(typeof response.body.error).toBe('string');
        }
      }
    });
  });
});