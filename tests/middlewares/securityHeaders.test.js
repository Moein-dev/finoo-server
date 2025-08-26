const request = require('supertest');
const express = require('express');
const { 
  securityHeaders, 
  corsHeaders, 
  sensitiveEndpointHeaders, 
  developmentHeaders,
  getCORSConfig,
  getCSPConfig,
  getHSTSConfig
} = require('../../middlewares/securityHeaders');

describe('Security Headers Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(securityHeaders());
    app.use(corsHeaders());
    app.use(developmentHeaders());
    
    app.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });
    
    app.get('/sensitive', sensitiveEndpointHeaders, (req, res) => {
      res.json({ message: 'sensitive' });
    });
  });

  describe('Basic Security Headers', () => {
    test('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should set X-XSS-Protection header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    test('should hide X-Powered-By header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should set Referrer-Policy header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['referrer-policy']).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    test('should set CORS headers for development', async () => {
      process.env.NODE_ENV = 'development';
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should expose rate limit headers', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Limit');
    });
  });

  describe('Content Security Policy', () => {
    test('should set CSP header in production', async () => {
      process.env.NODE_ENV = 'production';
      app = express();
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ message: 'test' }));
      
      const response = await request(app).get('/test');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should set CSP report-only in development', async () => {
      process.env.NODE_ENV = 'development';
      app = express();
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ message: 'test' }));
      
      const response = await request(app).get('/test');
      expect(response.headers['content-security-policy-report-only']).toBeDefined();
    });
  });

  describe('HSTS Headers', () => {
    test('should set HSTS header in production', async () => {
      process.env.NODE_ENV = 'production';
      app = express();
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ message: 'test' }));
      
      const response = await request(app).get('/test');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should not set HSTS header in development', async () => {
      process.env.NODE_ENV = 'development';
      app = express();
      app.use(securityHeaders());
      app.get('/test', (req, res) => res.json({ message: 'test' }));
      
      const response = await request(app).get('/test');
      expect(response.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('Sensitive Endpoint Headers', () => {
    test('should set additional cache control headers for sensitive endpoints', async () => {
      const response = await request(app).get('/sensitive');
      
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    test('should set strict CSP for sensitive endpoints', async () => {
      const response = await request(app).get('/sensitive');
      
      expect(response.headers['content-security-policy']).toContain("default-src 'none'");
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });

  describe('Development Headers', () => {
    test('should set development headers in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const response = await request(app).get('/test');
      
      expect(response.headers['x-development-mode']).toBe('true');
      expect(response.headers['access-control-allow-private-network']).toBe('true');
    });

    test('should not set development headers in production', async () => {
      process.env.NODE_ENV = 'production';
      app = express();
      app.use(developmentHeaders());
      app.get('/test', (req, res) => res.json({ message: 'test' }));
      
      const response = await request(app).get('/test');
      
      expect(response.headers['x-development-mode']).toBeUndefined();
      expect(response.headers['access-control-allow-private-network']).toBeUndefined();
    });
  });

  describe('Configuration Functions', () => {
    test('getCORSConfig should return development config for development', () => {
      process.env.NODE_ENV = 'development';
      const config = getCORSConfig();
      
      expect(config.origin).toContain('http://localhost:3000');
      expect(config.credentials).toBe(true);
    });

    test('getCORSConfig should use ALLOWED_ORIGINS for production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://finoo.ir,https://www.finoo.ir';
      
      const config = getCORSConfig();
      
      expect(config.origin).toContain('https://finoo.ir');
      expect(config.origin).toContain('https://www.finoo.ir');
    });

    test('getCSPConfig should allow eval in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getCSPConfig();
      
      expect(config.directives.scriptSrc).toContain("'unsafe-eval'");
      expect(config.reportOnly).toBe(true);
    });

    test('getCSPConfig should not allow eval in production', () => {
      process.env.NODE_ENV = 'production';
      const config = getCSPConfig();
      
      expect(config.directives.scriptSrc).not.toContain("'unsafe-eval'");
      expect(config.reportOnly).toBe(false);
    });

    test('getHSTSConfig should return config for production', () => {
      process.env.NODE_ENV = 'production';
      const config = getHSTSConfig();
      
      expect(config.maxAge).toBe(31536000);
      expect(config.includeSubDomains).toBe(true);
      expect(config.preload).toBe(true);
    });

    test('getHSTSConfig should return false for development', () => {
      process.env.NODE_ENV = 'development';
      const config = getHSTSConfig();
      
      expect(config).toBe(false);
    });
  });

  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.ALLOWED_ORIGINS;
  });
});