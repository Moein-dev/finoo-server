const helmet = require('helmet');

/**
 * Security Headers Middleware
 * Implements CORS, CSP, HSTS and other security headers
 * Environment-specific security policies
 */

// Environment-specific CORS configuration
const getCORSConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    origin: isProduction 
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://finoo.ir']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  };
};

// Content Security Policy configuration
const getCSPConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: isProduction 
        ? ["'self'"] 
        : ["'self'", "'unsafe-eval'"], // Allow eval in development for debugging
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
    reportOnly: !isProduction // Only enforce in production
  };
};

// HSTS configuration
const getHSTSConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false; // Disable HSTS in development
};

// Main security headers middleware
const securityHeaders = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: getCSPConfig(),
    
    // HTTP Strict Transport Security
    hsts: getHSTSConfig(),
    
    // X-Frame-Options
    frameguard: { action: 'deny' },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-XSS-Protection (legacy but still useful)
    xssFilter: true,
    
    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // IE No Open
    ieNoOpen: true,
    
    // Don't cache sensitive pages
    noCache: isProduction,
    
    // Permissions Policy (formerly Feature Policy)
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: []
      }
    }
  });
};

// CORS middleware
const corsHeaders = () => {
  const cors = require('cors');
  return cors(getCORSConfig());
};

// Additional security headers for sensitive endpoints
const sensitiveEndpointHeaders = (req, res, next) => {
  // Additional headers for authentication endpoints
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Prevent embedding in frames
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Additional CSP for sensitive endpoints
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  
  next();
};

// Development-specific headers
const developmentHeaders = () => {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      // Add development-specific headers for debugging
      res.setHeader('X-Development-Mode', 'true');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  };
};

module.exports = {
  securityHeaders,
  corsHeaders,
  sensitiveEndpointHeaders,
  developmentHeaders,
  getCORSConfig,
  getCSPConfig,
  getHSTSConfig
};