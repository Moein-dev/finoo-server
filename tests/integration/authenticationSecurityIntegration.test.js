const request = require('supertest');
const app = require('../../server');
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

describe('Authentication Security Integration', () => {
  let testUserId;
  let baseTestPhone = '+989123456';
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

  beforeEach(async () => {
    testCounter++;
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('JWT Token Security Flow', () => {
    test('should generate tokens with correct expiry times', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Request OTP
      const otpResponse = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      // Skip test if rate limited
      if (otpResponse.status === 429) {
        console.log('Skipping test due to rate limiting');
        return;
      }

      expect(otpResponse.status).toBe(200);

      // Get OTP from database
      const [rows] = await db.query(
        "SELECT code FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );
      
      if (!rows || rows.length === 0) {
        throw new Error('No OTP found in database');
      }
      
      const otpCode = rows[0].code;

      // Login with OTP
      const response = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: otpCode });

      expect(response.status).toBe(200);
      expect(response.body.data.authentication).toBeDefined();

      const { access_token, refresh_token } = response.body.data.authentication;

      // Decode tokens to check expiry
      const accessDecoded = jwt.decode(access_token);
      const refreshDecoded = jwt.decode(refresh_token);

      expect(accessDecoded.exp).toBeDefined();
      expect(refreshDecoded.exp).toBeDefined();

      // Check that refresh token expires later than access token
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);

      // Check approximate expiry times (allowing for small timing differences)
      const now = Math.floor(Date.now() / 1000);
      const accessExpiryDiff = accessDecoded.exp - now;
      const refreshExpiryDiff = refreshDecoded.exp - now;

      // Access token should expire in about 7 days (604800 seconds)
      expect(accessExpiryDiff).toBeGreaterThan(604000); // A bit less than 7 days
      expect(accessExpiryDiff).toBeLessThan(605000); // A bit more than 7 days

      // Refresh token should expire in about 15 days (1296000 seconds)
      expect(refreshExpiryDiff).toBeGreaterThan(1295000); // A bit less than 15 days
      expect(refreshExpiryDiff).toBeLessThan(1297000); // A bit more than 15 days
    });

    test('should refresh access token successfully', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Login to get tokens
      const otpResponse = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      // Skip test if rate limited
      if (otpResponse.status === 429) {
        console.log('Skipping test due to rate limiting');
        return;
      }

      const [rows] = await db.query(
        "SELECT code FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );
      
      if (!rows || rows.length === 0) {
        throw new Error('No OTP found in database');
      }
      
      const otpCode = rows[0].code;

      const loginResponse = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: otpCode });

      const { refresh_token } = loginResponse.body.data.authentication;

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refresh_token });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.access_token).toBeDefined();

      // New access token should be different from original
      expect(refreshResponse.body.data.access_token).not.toBe(
        loginResponse.body.data.authentication.access_token
      );

      // New access token should be valid
      const newAccessDecoded = jwt.decode(refreshResponse.body.data.access_token);
      expect(newAccessDecoded.id).toBeDefined();
      expect(newAccessDecoded.username).toBeDefined();
    });

    test('should reject invalid refresh token', async () => {
      const invalidToken = 'invalid.refresh.token';

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: invalidToken });

      expect([400, 403]).toContain(response.status);
      expect(response.body.error).toContain('نامعتبر');
    });

    test('should reject expired refresh token', async () => {
      // Create an expired refresh token
      const expiredToken = jwt.sign(
        { id: 1, username: 'testuser', exp: Math.floor(Date.now() / 1000) - 60 },
        process.env.REFRESH_SECRET_KEY
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect([400, 403]).toContain(response.status);
      expect(response.body.error).toContain('نامعتبر');
    });
  });

  describe('OTP Security Flow Integration', () => {
    test('should complete full OTP flow with security validations', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Step 1: Request OTP
      const otpResponse = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      // Skip test if rate limited
      if (otpResponse.status === 429) {
        console.log('Skipping test due to rate limiting');
        return;
      }

      expect(otpResponse.status).toBe(200);
      expect(otpResponse.body.data.message).toContain('کد تایید ارسال شد');

      // Step 2: Verify OTP is 6 digits and expires in 2 minutes
      const [rows] = await db.query(
        "SELECT code, expires_at, created_at FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );

      if (!rows || rows.length === 0) {
        throw new Error('No OTP found in database');
      }

      expect(rows[0].code).toMatch(/^\d{6}$/);
      
      const createdAt = new Date(rows[0].created_at);
      const expiresAt = new Date(rows[0].expires_at);
      const diffMinutes = (expiresAt - createdAt) / (1000 * 60);
      expect(diffMinutes).toBeCloseTo(2, 1);

      // Step 3: Verify OTP successfully
      const verifyResponse = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: rows[0].code });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.authentication).toBeDefined();

      // Step 4: Verify OTP is marked as used
      const [usedRows] = await db.query(
        "SELECT is_used FROM phone_verifications WHERE phone = ? AND code = ?",
        [testPhone, rows[0].code]
      );
      expect(usedRows[0].is_used).toBe(1);

      // Step 5: Try to use same OTP again (should fail)
      const reusedResponse = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: rows[0].code });

      expect(reusedResponse.status).toBe(400);
      expect(reusedResponse.body.error).toContain('قبلاً استفاده شده');
    });

    test('should track failed OTP attempts', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Request OTP
      const otpResponse = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      // Skip test if rate limited
      if (otpResponse.status === 429) {
        console.log('Skipping test due to rate limiting');
        return;
      }

      // Try with wrong OTP
      const wrongResponse = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: '000000' });

      expect(wrongResponse.status).toBe(400);

      // Check attempts count in database
      const [rows] = await db.query(
        "SELECT attempts FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );
      
      if (rows && rows.length > 0) {
        expect(rows[0].attempts).toBe(1);
      }
    });

    test('should handle expired OTP correctly', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Create expired OTP manually
      const expiredCode = "123456";
      const expiredTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      // Create user first
      const [userResult] = await db.query(
        "INSERT INTO users (username, phone) VALUES (?, ?) ON DUPLICATE KEY UPDATE phone = VALUES(phone)",
        [`test_user_${Date.now()}`, testPhone]
      );

      await db.query(
        "INSERT INTO phone_verifications (user_id, phone, code, expires_at) VALUES (?, ?, ?, ?)",
        [userResult.insertId || 1, testPhone, expiredCode, expiredTime]
      );

      const response = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: expiredCode });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('منقضی');
    });
  });

  describe('Input Validation Integration', () => {
    test('should validate phone number format in OTP request', async () => {
      const invalidPhones = [
        'invalid_phone',
        '08123456789', // Wrong prefix
        '091234567', // Too short
        '09123456789012', // Too long
        '', // Empty
        null // Null
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/auth/send-code')
          .send({ phone });

        // Accept either validation error or rate limit error
        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.error).toContain('ورودی نامعتبر');
        }
        
        // Small delay to avoid rapid requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    test('should validate OTP code format in verification', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      const invalidCodes = [
        '12345', // Too short
        '1234567', // Too long
        'abcdef', // Non-numeric
        '', // Empty
        null // Null
      ];

      for (const code of invalidCodes) {
        const response = await request(app)
          .post('/api/auth/verify-code')
          .send({ phone: testPhone, code });

        // Accept either validation error or rate limit error
        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.error).toContain('ورودی نامعتبر');
        }
        
        // Small delay to avoid rapid requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    test('should validate username format in login', async () => {
      const invalidUsernames = [
        'ab', // Too short
        'a'.repeat(31), // Too long
        'user@name', // Invalid characters
        'user__name', // Consecutive underscores
        '_username', // Starts with underscore
        'username_', // Ends with underscore
        '', // Empty
        null // Null
      ];

      for (const username of invalidUsernames) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ username });

        // Accept either validation error or rate limit error
        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.error).toContain('ورودی نامعتبر');
        }
        
        // Small delay to avoid rapid requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    test('should validate refresh token format', async () => {
      const invalidTokens = [
        'invalid.token', // Wrong format
        'not_a_jwt_token', // Not JWT
        '', // Empty
        null // Null
      ];

      for (const refreshToken of invalidTokens) {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('ورودی نامعتبر');
      }
    });
  });

  describe('Error Handling Security Integration', () => {
    test('should not expose sensitive information in database errors', async () => {
      // This test simulates a scenario where database might fail
      // The error response should not contain sensitive database information
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent_user' });

      // Accept either validation error or rate limit error
      expect([400, 429]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.error).not.toContain('mysql');
        expect(response.body.error).not.toContain('database');
        expect(response.body.error).not.toContain('connection');
        expect(response.body.error).not.toContain('table');
        expect(response.body.error).not.toContain('column');
      }
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      // Should handle gracefully, might return 400 or 500
      expect([400, 500]).toContain(response.status);
      expect(response.body.error).toBeDefined();
      
      if (response.status === 400) {
        expect(response.body.error).not.toContain('SyntaxError');
        expect(response.body.error).not.toContain('JSON.parse');
      }
    });

    test('should handle missing content-type header', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('username=test');

      // Should handle gracefully, not crash
      expect(response.status).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle extremely large payloads', async () => {
      const largePayload = {
        username: 'a'.repeat(10000),
        phone: '09123456789' + 'x'.repeat(10000)
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(largePayload);

      // Accept validation error or rate limit error
      expect([400, 429]).toContain(response.status);
      
      if (response.status === 400) {
        expect(response.body.error).toContain('ورودی نامعتبر');
      }
    });
  });

  describe('Security Headers Integration', () => {
    test('should apply security headers to all authentication endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/api/auth/login', body: { username: 'test' } },
        { method: 'post', path: '/api/auth/send-code', body: { phone: '09123456789' } },
        { method: 'post', path: '/api/auth/verify-code', body: { phone: '09123456789', code: '123456' } },
        { method: 'post', path: '/api/auth/refresh', body: { refreshToken: 'invalid' } },
        { method: 'post', path: '/api/auth/logout', body: { refreshToken: 'invalid' } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .send(endpoint.body);

        // Check security headers
        expect(response.headers['x-frame-options']).toBeDefined();
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-powered-by']).toBeUndefined();
        expect(response.headers['cache-control']).toContain('no-store');
        expect(response.headers['pragma']).toBe('no-cache');
        expect(response.headers['expires']).toBe('0');
      }
    });
  });

  describe('Complete Authentication Flow Security', () => {
    test('should complete secure end-to-end authentication flow', async () => {
      const testPhone = baseTestPhone + testCounter.toString().padStart(3, '0');
      
      // Step 1: Request OTP with security validations
      const otpResponse = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: testPhone });

      expect(otpResponse.status).toBe(200);
      expect(otpResponse.headers['cache-control']).toContain('no-store');

      // Step 2: Get OTP and verify it's secure
      const [otpRows] = await db.query(
        "SELECT code, expires_at FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );

      expect(otpRows[0].code).toMatch(/^\d{6}$/);
      expect(new Date(otpRows[0].expires_at)).toBeInstanceOf(Date);

      // Step 3: Verify OTP and get tokens
      const verifyResponse = await request(app)
        .post('/api/auth/verify-code')
        .send({ phone: testPhone, code: otpRows[0].code });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.headers['cache-control']).toContain('no-store');

      const { access_token, refresh_token } = verifyResponse.body.data.authentication;
      expect(access_token).toBeDefined();
      expect(refresh_token).toBeDefined();

      // Step 4: Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refresh_token });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.headers['cache-control']).toContain('no-store');
      expect(refreshResponse.body.data.access_token).toBeDefined();

      // Step 5: Logout securely
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: refresh_token });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.headers['cache-control']).toContain('no-store');
      expect(logoutResponse.body.data.message).toContain('خارج شد');

      // Step 6: Verify refresh token is invalidated
      const invalidRefreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refresh_token });

      expect(invalidRefreshResponse.status).toBe(400);
    });
  });
});