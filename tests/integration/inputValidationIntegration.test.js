const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/authRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Input Validation Integration Tests', () => {
  describe('POST /auth/login', () => {
    test('should accept valid username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'validuser123'
        });

      // Should not return validation error (400)
      // May return other errors like user not found, but not validation error
      expect(response.status).not.toBe(400);
    });

    test('should reject invalid username with special characters', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'invalid@user'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.username).toContain('حروف انگلیسی، اعداد و خط زیر');
    });

    test('should reject username that is too short', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'ab'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.username).toContain('حداقل 3 کاراکتر');
    });

    test('should normalize username to lowercase', async () => {
      // This test would need to mock the controller to verify the normalized input
      // For now, we'll just verify it doesn't return validation error
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'ValidUser123'
        });

      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /auth/send-code', () => {
    test('should accept valid Iranian phone number', async () => {
      const response = await request(app)
        .post('/auth/send-code')
        .send({
          phone: '09123456789'
        });

      // Should not return validation error (400)
      expect(response.status).not.toBe(400);
    });

    test('should accept phone number with +98 prefix', async () => {
      const response = await request(app)
        .post('/auth/send-code')
        .send({
          phone: '+989123456789'
        });

      expect(response.status).not.toBe(400);
    });

    test('should reject invalid phone number format', async () => {
      const response = await request(app)
        .post('/auth/send-code')
        .send({
          phone: '08123456789'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.phone).toContain('فرمت شماره تلفن صحیح نیست');
    });

    test('should reject empty phone number', async () => {
      const response = await request(app)
        .post('/auth/send-code')
        .send({
          phone: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.phone).toContain('شماره تلفن الزامی است');
    });
  });

  describe('POST /auth/verify-code', () => {
    test('should accept valid phone and OTP', async () => {
      const response = await request(app)
        .post('/auth/verify-code')
        .send({
          phone: '09123456789',
          code: '123456'
        });

      expect(response.status).not.toBe(400);
    });

    test('should reject invalid OTP length', async () => {
      const response = await request(app)
        .post('/auth/verify-code')
        .send({
          phone: '09123456789',
          code: '12345'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.code).toContain('6 رقم باشد');
    });

    test('should sanitize OTP with non-digit characters', async () => {
      const response = await request(app)
        .post('/auth/verify-code')
        .send({
          phone: '09123456789',
          code: '12-34-56'
        });

      // Should not return validation error as it gets sanitized to '123456'
      expect(response.status).not.toBe(400);
    });

    test('should reject both invalid phone and OTP', async () => {
      const response = await request(app)
        .post('/auth/verify-code')
        .send({
          phone: 'invalid',
          code: '12345'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.phone).toContain('فرمت شماره تلفن صحیح نیست');
      expect(response.body.details.code).toContain('6 رقم باشد');
    });
  });

  describe('POST /auth/refresh', () => {
    test('should accept valid JWT format', async () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: validJWT
        });

      expect(response.status).not.toBe(400);
    });

    test('should reject invalid JWT format', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid.token'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.refreshToken).toContain('فرمت کد بازیابی صحیح نیست');
    });

    test('should reject empty refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.refreshToken).toContain('کد بازیابی الزامی است');
    });
  });

  describe('POST /auth/logout', () => {
    test('should accept valid JWT format', async () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const response = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: validJWT
        });

      expect(response.status).not.toBe(400);
    });

    test('should reject invalid JWT format', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: 'invalid.token'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.refreshToken).toContain('فرمت کد بازیابی صحیح نیست');
    });
  });

  describe('POST /auth/register', () => {
    test('should accept valid registration data', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser123',
          name: 'Test User'
        });

      expect(response.status).not.toBe(400);
    });

    test('should accept registration without username (auto-generated)', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User'
        });

      expect(response.status).not.toBe(400);
    });

    test('should accept registration without name', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser123'
        });

      expect(response.status).not.toBe(400);
    });

    test('should reject invalid username in registration', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'invalid@user',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ورودی نامعتبر');
      expect(response.body.details.username).toContain('حروف انگلیسی، اعداد و خط زیر');
    });
  });
});