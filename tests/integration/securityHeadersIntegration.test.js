const request = require('supertest');
const app = require('../../server');

describe('Security Headers Integration', () => {
  describe('General API Endpoints', () => {
    test('should apply security headers to root endpoint', async () => {
      const response = await request(app).get('/');
      
      // Basic security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should apply CORS headers', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should set development headers in test environment', async () => {
      const response = await request(app).get('/');
      
      // In test environment, development headers should be set
      expect(response.headers['x-development-mode']).toBe('true');
      expect(response.headers['access-control-allow-private-network']).toBe('true');
    });
  });

  describe('Authentication Endpoints', () => {
    test('should apply sensitive endpoint headers to login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test' });
      
      // Should have additional cache control headers
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
      
      // Should have strict CSP
      expect(response.headers['content-security-policy']).toContain("default-src 'none'");
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    test('should apply sensitive endpoint headers to OTP endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/send-code')
        .send({ phone: '09123456789' });
      
      // Should have additional cache control headers
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    test('should apply sensitive endpoint headers to refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });
      
      // Should have additional cache control headers
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    test('should apply sensitive endpoint headers to logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-token' });
      
      // Should have additional cache control headers
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });
  });

  describe('Static Files', () => {
    test('should apply security headers to static icon files', async () => {
      const response = await request(app).get('/icons/btc_icon.svg');
      
      // Should have basic security headers even for static files
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should apply security headers to 404 responses', async () => {
      const response = await request(app).get('/nonexistent-route');
      
      expect(response.status).toBe(404);
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});