# راهنمای بهترین روش‌های امنیتی Finoo API

## نمای کلی

این سند شامل راهنمای کامل بهترین روش‌های امنیتی برای توسعه، استقرار و نگهداری API Finoo است. این راهنما بر اساس استانداردهای امنیتی مدرن و بهترین practices صنعت تهیه شده است.

## امنیت Authentication و Authorization

### JWT Token Management

#### تنظیمات امن Token
```javascript
// مدت زمان کوتاه برای access tokens
ACCESS_TOKEN_EXPIRY=7d  // 7 روز (کاهش یافته از 30 روز)
REFRESH_TOKEN_EXPIRY=15d  // 15 روز (کاهش یافته از 60 روز)
```

#### Secret Key Security
```bash
# تولید secret keys امن
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# حداقل طول secret key: 32 کاراکتر
# توصیه شده: 64 کاراکتر یا بیشتر
SECRET_KEY=your-64-character-or-longer-secret-key-here
REFRESH_SECRET_KEY=different-64-character-secret-for-refresh-tokens
```

#### Token Storage Best Practices
- **Client-side**: استفاده از secure storage (Keychain در iOS، Keystore در Android)
- **Web**: استفاده از HttpOnly cookies یا secure localStorage
- **Server-side**: ذخیره refresh tokens در database با encryption

### OTP Security Enhancements

#### تنظیمات امن OTP
```bash
OTP_LENGTH=6              # 6 رقم (افزایش از 5 رقم)
OTP_EXPIRY_MINUTES=2      # 2 دقیقه (کاهش از 5 دقیقه)
OTP_MAX_ATTEMPTS=3        # حداکثر 3 تلاش ناموفق
```

#### OTP Generation Security
```javascript
// استفاده از crypto.randomInt برای تولید امن
const crypto = require('crypto');

function generateSecureOTP(length = 6) {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += crypto.randomInt(0, 10).toString();
    }
    return otp;
}
```

#### One-Time Use Implementation
- هر OTP فقط یکبار قابل استفاده است
- بعد از استفاده موفق، OTP از database حذف یا invalid می‌شود
- tracking تلاش‌های ناموفق برای شناسایی حملات

## Rate Limiting و DDoS Protection

### تنظیمات Rate Limiting

#### OTP Rate Limiting
```bash
# حداکثر 3 درخواست OTP در 5 دقیقه
OTP_RATE_LIMIT_WINDOW_MS=300000
OTP_RATE_LIMIT_MAX=3
```

#### Login Rate Limiting
```bash
# حداکثر 5 تلاش ورود در 15 دقیقه
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=5
```

#### General API Rate Limiting
```bash
# حداکثر 100 درخواست در ساعت
GENERAL_RATE_LIMIT_WINDOW_MS=3600000
GENERAL_RATE_LIMIT_MAX=100
```

### Implementation Best Practices

#### IP-based و User-based Limiting
```javascript
// ترکیب IP و User ID برای rate limiting دقیق‌تر
const keyGenerator = (req) => {
    const userId = req.user?.id || 'anonymous';
    return `${req.ip}-${userId}`;
};
```

#### Graceful Error Responses
```javascript
// پیام‌های واضح با retry-after headers
{
    "status": 429,
    "error": "Too many requests",
    "retryAfter": 300,
    "message": "Please try again in 5 minutes"
}
```

## Input Validation و Sanitization

### Phone Number Validation
```javascript
// اعتبارسنجی فرمت شماره موبایل ایران
const phoneRegex = /^09[0-9]{9}$/;

function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
        return { valid: false, error: 'Phone number is required' };
    }
    
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
        return { valid: false, error: 'Invalid phone number format' };
    }
    
    return { valid: true, phone: cleanPhone };
}
```

### Username Validation
```javascript
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { valid: false, error: 'Username is required' };
    }
    
    const cleanUsername = username.trim().toLowerCase();
    
    // طول بین 3 تا 50 کاراکتر
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
        return { valid: false, error: 'Username must be 3-50 characters' };
    }
    
    // فقط حروف، اعداد و underscore
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanUsername)) {
        return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    
    return { valid: true, username: cleanUsername };
}
```

### SQL Injection Prevention
```javascript
// استفاده از prepared statements
const query = 'SELECT * FROM users WHERE phone = ?';
db.query(query, [phone], (err, results) => {
    // Safe from SQL injection
});

// اجتناب از string concatenation
// ❌ غلط
const query = `SELECT * FROM users WHERE phone = '${phone}'`;

// ✅ درست
const query = 'SELECT * FROM users WHERE phone = ?';
```

## Error Handling امن

### Generic Error Messages
```javascript
// برای client: پیام‌های عمومی
const clientError = {
    status: 400,
    error: "Invalid input provided",
    code: "VALIDATION_ERROR"
};

// برای server logs: جزئیات کامل
const serverLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Database connection failed',
    error: error.stack,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
};
```

### Error Classification
```javascript
const ErrorTypes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTH_ERROR',
    AUTHORIZATION_ERROR: 'ACCESS_DENIED',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_EXCEEDED',
    SERVER_ERROR: 'INTERNAL_ERROR'
};

function handleError(error, req, res) {
    // Log detailed error server-side
    logger.error('Request failed', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.id
    });
    
    // Send generic error to client
    const clientResponse = {
        status: error.statusCode || 500,
        error: error.clientMessage || 'An error occurred',
        code: error.code || ErrorTypes.SERVER_ERROR
    };
    
    res.status(clientResponse.status).json(clientResponse);
}
```

## Security Headers

### Helmet Configuration
```javascript
const helmet = require('helmet');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }
}));
```

### CORS Configuration
```javascript
const cors = require('cors');

const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

## Database Security

### Connection Security
```javascript
const mysql = require('mysql2');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true
    } : false,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};
```

### Data Encryption
```javascript
const crypto = require('crypto');

// Encrypt sensitive data before storing
function encryptData(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// Decrypt when retrieving
function decryptData(encryptedData, key) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
```

## Logging و Monitoring

### Security Event Logging
```javascript
const securityLogger = {
    logFailedLogin: (userId, ip, userAgent) => {
        logger.warn('Failed login attempt', {
            event: 'FAILED_LOGIN',
            userId,
            ip,
            userAgent,
            timestamp: new Date().toISOString()
        });
    },
    
    logRateLimitExceeded: (ip, endpoint, userAgent) => {
        logger.warn('Rate limit exceeded', {
            event: 'RATE_LIMIT_EXCEEDED',
            ip,
            endpoint,
            userAgent,
            timestamp: new Date().toISOString()
        });
    },
    
    logSuspiciousActivity: (userId, activity, details) => {
        logger.error('Suspicious activity detected', {
            event: 'SUSPICIOUS_ACTIVITY',
            userId,
            activity,
            details,
            timestamp: new Date().toISOString()
        });
    }
};
```

### Performance Monitoring
```javascript
function performanceMiddleware(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log slow requests
        if (duration > 1000) {
            logger.warn('Slow request detected', {
                method: req.method,
                url: req.url,
                duration,
                statusCode: res.statusCode
            });
        }
        
        // Log to metrics service
        metrics.recordRequestDuration(req.route?.path || req.url, duration);
    });
    
    next();
}
```

## Production Security Checklist

### Environment Configuration
- [ ] تمام environment variables تنظیم شده‌اند
- [ ] Secret keys حداقل 64 کاراکتر هستند
- [ ] Database credentials امن هستند
- [ ] HTTPS فعال است
- [ ] SSL certificates معتبر هستند

### Security Headers
- [ ] Helmet middleware فعال است
- [ ] CORS به درستی تنظیم شده
- [ ] CSP headers تنظیم شده‌اند
- [ ] HSTS فعال است

### Rate Limiting
- [ ] Rate limiting برای تمام endpoints فعال است
- [ ] OTP rate limiting تنظیم شده
- [ ] Login rate limiting فعال است
- [ ] DDoS protection در نظر گرفته شده

### Authentication & Authorization
- [ ] JWT tokens مدت زمان کوتاه دارند
- [ ] Refresh token mechanism کار می‌کند
- [ ] OTP security بهبود یافته
- [ ] Input validation فعال است

### Monitoring & Logging
- [ ] Security event logging فعال است
- [ ] Error logging تنظیم شده
- [ ] Performance monitoring فعال است
- [ ] Log rotation تنظیم شده

### Database Security
- [ ] Database connection امن است
- [ ] Prepared statements استفاده می‌شوند
- [ ] Sensitive data encrypt می‌شود
- [ ] Regular backups انجام می‌شود

## Security Testing

### Automated Security Tests
```javascript
// تست rate limiting
describe('Rate Limiting Security', () => {
    test('should block excessive OTP requests', async () => {
        const requests = Array(4).fill().map(() => 
            request(app)
                .post('/api/auth/send-code')
                .send({ phone: '09123456789' })
        );
        
        const responses = await Promise.all(requests);
        expect(responses[3].status).toBe(429);
    });
});

// تست input validation
describe('Input Validation Security', () => {
    test('should reject invalid phone numbers', async () => {
        const response = await request(app)
            .post('/api/auth/send-code')
            .send({ phone: 'invalid-phone' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid phone number');
    });
});
```

### Manual Security Testing
1. **SQL Injection Testing**: تست injection در تمام input fields
2. **XSS Testing**: تست script injection در form fields
3. **Authentication Bypass**: تست دسترسی بدون authentication
4. **Rate Limiting**: تست محدودیت‌های درخواست
5. **Error Information Disclosure**: بررسی عدم لو رفتن اطلاعات حساس

## Incident Response

### Security Incident Handling
1. **Detection**: شناسایی سریع تهدیدات امنیتی
2. **Containment**: محدود کردن دامنه حمله
3. **Investigation**: بررسی علت و نحوه حمله
4. **Recovery**: بازیابی سیستم به حالت امن
5. **Lessons Learned**: بهبود امنیت بر اساس تجربه

### Emergency Contacts
```bash
# تماس‌های اضطراری
SECURITY_TEAM_EMAIL=security@finoo.ir
INCIDENT_RESPONSE_PHONE=+98-xxx-xxx-xxxx
BACKUP_ADMIN_EMAIL=admin@finoo.ir
```

## منابع و مراجع

### Security Standards
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### Tools و Libraries
- [Helmet.js](https://helmetjs.github.io/) - Security headers
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit) - Rate limiting
- [joi](https://joi.dev/) - Input validation
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Password hashing

### Monitoring Services
- [New Relic](https://newrelic.com/) - Application monitoring
- [DataDog](https://www.datadoghq.com/) - Infrastructure monitoring
- [Sentry](https://sentry.io/) - Error tracking