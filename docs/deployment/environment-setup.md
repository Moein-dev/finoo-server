# راه‌اندازی محیط و پیکربندی

## نمای کلی

این سند شامل راهنمای کامل راه‌اندازی محیط توسعه، تنظیمات production و مدیریت متغیرهای محیطی برای پروژه Finoo Backend است.

## پیش‌نیازهای سیستم

### نرم‌افزارهای مورد نیاز

#### 1. Node.js
```bash
# نصب Node.js (نسخه 18 یا بالاتر)
# از طریق nvm (توصیه می‌شود)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# یا از طریق package manager
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. MySQL
```bash
# macOS
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# تنظیم امنیتی MySQL
sudo mysql_secure_installation
```

#### 3. Git
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git
```

#### 4. PM2 (برای production)
```bash
npm install -g pm2
```

### بررسی نصب

```bash
# بررسی نسخه‌ها
node --version    # باید >= 18.0.0 باشد
npm --version     # باید >= 8.0.0 باشد
mysql --version   # باید >= 8.0.0 باشد
git --version
```

## راه‌اندازی پروژه

### 1. Clone کردن پروژه

```bash
# Clone از repository
git clone https://github.com/your-username/finoo-backend.git
cd finoo-backend

# یا اگر از SSH استفاده می‌کنید
git clone git@github.com:your-username/finoo-backend.git
cd finoo-backend
```

### 2. نصب Dependencies

```bash
# نصب تمام وابستگی‌ها
npm install

# یا با yarn
yarn install

# بررسی وابستگی‌های امنیتی
npm audit
npm audit fix
```

### 3. تنظیم دیتابیس

#### ایجاد دیتابیس

```sql
-- اتصال به MySQL
mysql -u root -p

-- ایجاد دیتابیس
CREATE DATABASE finoo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ایجاد کاربر جدید (اختیاری)
CREATE USER 'finoo_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON finoo_db.* TO 'finoo_user'@'localhost';
FLUSH PRIVILEGES;

-- خروج
EXIT;
```

#### ایجاد جداول

```sql
-- اتصال به دیتابیس finoo
mysql -u finoo_user -p finoo_db

-- جدول categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول currencies
CREATE TABLE currencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    category_id INT NOT NULL,
    icon VARCHAR(255) NULL,
    server_key VARCHAR(100) UNIQUE NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'IRR',
    color VARCHAR(7) DEFAULT '#FFFFFF',
    priority INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_symbol (symbol),
    INDEX idx_priority (priority),
    INDEX idx_category_priority (category_id, priority)
);

-- جدول users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NULL,
    email_verified_at TIMESTAMP NULL,
    phone VARCHAR(20) NULL,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    name VARCHAR(255) NULL,
    image VARCHAR(255) NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    refresh_token TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email)
);

-- جدول new_prices
CREATE TABLE new_prices (
    id VARCHAR(36) PRIMARY KEY,
    currency_id INT NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    percent_bubble DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE CASCADE,
    INDEX idx_currency_date (currency_id, created_at),
    INDEX idx_created_at (created_at),
    INDEX idx_currency_latest (currency_id, created_at DESC)
);

-- جدول phone_verifications
CREATE TABLE phone_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_phone (user_id, phone),
    INDEX idx_phone_code (phone, code),
    INDEX idx_expires_at (expires_at)
);
```

#### داده‌های اولیه

```sql
-- دسته‌بندی‌ها
INSERT INTO categories (name, type) VALUES
('ارز', 'currency'),
('رمزارز', 'crypto'),
('فلز گرانبها', 'metal'),
('سهام', 'stock');

-- ارزهای اصلی
INSERT INTO currencies (name, symbol, category_id, server_key, unit, color, priority) VALUES
('دلار آمریکا', 'USD', 1, 'price_dollar_rl', 'IRR', '#22c55e', 1),
('یورو', 'EUR', 1, 'price_eur', 'IRR', '#3b82f6', 2),
('پوند انگلیس', 'GBP', 1, 'price_gbp', 'IRR', '#8b5cf6', 3),
('درهم امارات', 'AED', 1, 'price_aed', 'IRR', '#f59e0b', 4),
('بیت کوین', 'BTC', 2, 'price_bit', 'USD', '#f59e0b', 5),
('اتریوم', 'ETH', 2, 'price_eth', 'USD', '#6366f1', 6),
('طلا', 'GOLD', 3, 'sekee', 'IRR', '#fbbf24', 10),
('نقره', 'SILVER', 3, 'ons_noghre', 'IRR', '#9ca3af', 11);
```

## متغیرهای محیطی

### فایل `.env`

```bash
# کپی کردن فایل نمونه
cp .env.example .env

# ویرایش فایل .env
nano .env
```

### تنظیمات کامل `.env`

```bash
# ===========================================
# SERVER CONFIGURATION
# ===========================================
NODE_ENV=development
PORT=3000

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DB_HOST=localhost
DB_USER=finoo_user
DB_PASSWORD=secure_password_here
DB_NAME=finoo_db

# ===========================================
# JWT CONFIGURATION (Security Enhanced)
# ===========================================
# تولید secret key های قوی:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SECRET_KEY=your-very-long-and-random-secret-key-here-at-least-64-characters-long
REFRESH_SECRET_KEY=another-different-very-long-secret-key-for-refresh-tokens-64-chars

# JWT Token Expiry (Security Enhanced)
ACCESS_TOKEN_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=15d

# ===========================================
# SMS SERVICE CONFIGURATION (Trez.ir)
# ===========================================
SMS_USERNAME=your_sms_username
SMS_PASSWORD=your_sms_password
SMS_API_URL=http://smspanel.Trez.ir/SendMessageWithCode.ashx

# ===========================================
# EMAIL CONFIGURATION
# ===========================================
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587

# ===========================================
# EXTERNAL API CONFIGURATION
# ===========================================
TGJU_API_URLS=https://call1.tgju.org/ajax.json,https://call2.tgju.org/ajax.json,https://call3.tgju.org/ajax.json

# ===========================================
# CORS CONFIGURATION
# ===========================================
ALLOWED_ORIGINS=https://finoo.ir,https://www.finoo.ir,https://app.finoo.ir

# ===========================================
# FILE UPLOAD CONFIGURATION
# ===========================================
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,image/webp

# ===========================================
# RATE LIMITING CONFIGURATION (Security Enhanced)
# ===========================================
# OTP Rate Limiting - 3 requests per 5 minutes
OTP_RATE_LIMIT_WINDOW_MS=300000
OTP_RATE_LIMIT_MAX=3

# Login Rate Limiting - 5 attempts per 15 minutes
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=5

# General API Rate Limiting - 100 requests per hour
GENERAL_RATE_LIMIT_WINDOW_MS=3600000
GENERAL_RATE_LIMIT_MAX=100

# ===========================================
# OTP SECURITY CONFIGURATION (Security Enhanced)
# ===========================================
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=2
OTP_MAX_ATTEMPTS=3

# ===========================================
# LOGGING CONFIGURATION
# ===========================================
LOG_LEVEL=info
LOG_FILE=logs/app.log

# ===========================================
# REDIS CONFIGURATION (اختیاری)
# ===========================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# ===========================================
# MONITORING CONFIGURATION
# ===========================================
HEALTH_CHECK_INTERVAL=30000
```

### تولید Secret Keys

```bash
# تولید secret key های امن
node -e "console.log('SECRET_KEY=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('REFRESH_SECRET_KEY=' + require('crypto').randomBytes(64).toString('hex'))"
```

## تنظیمات محیط‌های مختلف

### Development Environment

```bash
# فایل .env.development
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_NAME=finoo_dev
LOG_LEVEL=debug

# اجرای پروژه در حالت development
npm run dev

# یا با nodemon
npx nodemon server.js
```

### Testing Environment

```bash
# فایل .env.test
NODE_ENV=test
PORT=3001
DB_HOST=localhost
DB_NAME=finoo_test
LOG_LEVEL=error

# اجرای تست‌ها
npm test
```

### Production Environment

```bash
# فایل .env.production
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_NAME=finoo_production
LOG_LEVEL=warn

# اجرای پروژه در production
npm start

# یا با PM2
pm2 start ecosystem.config.js --env production
```

## پیکربندی PM2

### فایل `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'finoo-backend',
    script: 'server.js',
    instances: 'max', // استفاده از تمام CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Log configuration
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto restart configuration
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_memory_restart: '1G',
    
    // Advanced configuration
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Environment variables
    env_file: '.env'
  }]
};
```

### دستورات PM2

```bash
# شروع اپلیکیشن
pm2 start ecosystem.config.js

# شروع در حالت production
pm2 start ecosystem.config.js --env production

# مشاهده وضعیت
pm2 status
pm2 list

# مشاهده logs
pm2 logs finoo-backend
pm2 logs finoo-backend --lines 100

# Restart
pm2 restart finoo-backend

# Stop
pm2 stop finoo-backend

# Delete
pm2 delete finoo-backend

# Monitor
pm2 monit

# Save configuration
pm2 save
pm2 startup
```

## Docker Configuration

### Dockerfile

```dockerfile
# استفاده از Node.js 18 Alpine
FROM node:18-alpine

# تنظیم working directory
WORKDIR /app

# کپی package files
COPY package*.json ./

# نصب dependencies
RUN npm ci --only=production && npm cache clean --force

# کپی source code
COPY . .

# ایجاد user غیر root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S finoo -u 1001

# تنظیم permissions
RUN chown -R finoo:nodejs /app
USER finoo

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start command
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mysql
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - finoo-network

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    restart: unless-stopped
    networks:
      - finoo-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - finoo-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - finoo-network

volumes:
  mysql_data:
  redis_data:

networks:
  finoo-network:
    driver: bridge
```

## Nginx Configuration

### فایل `nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream finoo_backend {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    server {
        listen 80;
        server_name finoo.ir www.finoo.ir;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name finoo.ir www.finoo.ir;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://finoo_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Auth Routes (stricter rate limiting)
        location /api/auth/ {
            limit_req zone=auth burst=10 nodelay;
            proxy_pass http://finoo_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /icons/ {
            proxy_pass http://finoo_backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Health check
        location /health {
            proxy_pass http://finoo_backend;
            access_log off;
        }
    }
}
```

## Health Check

### فایل `healthcheck.js`

```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

### Health Check Endpoint

```javascript
// در server.js
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };
  
  try {
    // بررسی اتصال دیتابیس
    db.query('SELECT 1', (err) => {
      if (err) {
        healthCheck.database = 'ERROR';
        return res.status(503).json(healthCheck);
      }
      
      healthCheck.database = 'OK';
      res.status(200).json(healthCheck);
    });
  } catch (error) {
    healthCheck.database = 'ERROR';
    res.status(503).json(healthCheck);
  }
});
```

## Scripts در package.json

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "NODE_ENV=test jest",
    "test:watch": "NODE_ENV=test jest --watch",
    "test:coverage": "NODE_ENV=test jest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "db:reset": "node scripts/reset.js",
    "logs": "pm2 logs finoo-backend",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop finoo-backend",
    "pm2:restart": "pm2 restart finoo-backend",
    "pm2:delete": "pm2 delete finoo-backend",
    "docker:build": "docker build -t finoo-backend .",
    "docker:run": "docker-compose up -d",
    "docker:stop": "docker-compose down",
    "backup:db": "node scripts/backup-db.js",
    "restore:db": "node scripts/restore-db.js"
  }
}
```

## مدیریت Logs

### تنظیمات Logging

```javascript
// utils/logger.js
const fs = require('fs');
const path = require('path');

// ایجاد پوشه logs
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    pid: process.pid
  };

  // Console output
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
  }

  // File output
  const logFile = path.join(logDir, `${level}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

module.exports = {
  error: (message, data) => log('error', message, data),
  warn: (message, data) => log('warn', message, data),
  info: (message, data) => log('info', message, data),
  debug: (message, data) => log('debug', message, data)
};
```

### Log Rotation

```javascript
// scripts/rotate-logs.js
const fs = require('fs');
const path = require('path');

function rotateLogs() {
  const logDir = 'logs';
  const maxSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 5;

  const logFiles = ['error.log', 'warn.log', 'info.log', 'debug.log'];

  logFiles.forEach(filename => {
    const filepath = path.join(logDir, filename);
    
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      
      if (stats.size > maxSize) {
        // Rotate existing files
        for (let i = maxFiles - 1; i > 0; i--) {
          const oldFile = `${filepath}.${i}`;
          const newFile = `${filepath}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            if (i === maxFiles - 1) {
              fs.unlinkSync(oldFile); // Delete oldest
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }
        
        // Move current log to .1
        fs.renameSync(filepath, `${filepath}.1`);
        
        // Create new empty log file
        fs.writeFileSync(filepath, '');
      }
    }
  });
}

// اجرای هر روز در ساعت 2 صبح
if (require.main === module) {
  rotateLogs();
}

module.exports = rotateLogs;
```

## Monitoring و Performance

### Performance Monitoring

```javascript
// middlewares/performanceMiddleware.js
function performanceMonitoring(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url } = req;
    const { statusCode } = res;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${method} ${url} - ${duration}ms - ${statusCode}`);
    }
    
    // Log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (e.g., New Relic, DataDog)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method,
        url,
        statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }));
    }
  });
  
  next();
}

module.exports = performanceMonitoring;
```

## تست Environment

### تنظیمات Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'middlewares/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### فایل Setup تست

```javascript
// tests/setup.js
const db = require('../config/db');

// تنظیمات قبل از اجرای تست‌ها
beforeAll(async () => {
  // اتصال به test database
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'finoo_test';
});

// پاکسازی بعد از تست‌ها
afterAll(async () => {
  // بستن اتصال دیتابیس
  if (db && db.end) {
    await db.end();
  }
});

// پاکسازی بعد از هر تست
afterEach(async () => {
  // پاک کردن داده‌های تست
  await db.query('DELETE FROM phone_verifications');
  await db.query('DELETE FROM new_prices');
  await db.query('DELETE FROM users WHERE username LIKE "test_%"');
});
```

## چک‌لیست راه‌اندازی

### Development Setup
- [ ] نصب Node.js (نسخه 18+)
- [ ] نصب MySQL
- [ ] Clone پروژه
- [ ] نصب dependencies (`npm install`)
- [ ] کپی `.env.example` به `.env`
- [ ] تنظیم متغیرهای محیطی
- [ ] ایجاد دیتابیس
- [ ] اجرای migration ها
- [ ] تست اجرای پروژه (`npm run dev`)

### Production Setup
- [ ] تنظیم سرور (Ubuntu/CentOS)
- [ ] نصب Node.js، MySQL، Nginx
- [ ] تنظیم firewall
- [ ] تنظیم SSL certificate
- [ ] کپی فایل‌های پروژه
- [ ] تنظیم متغیرهای محیطی production
- [ ] تنظیم PM2
- [ ] تنظیم Nginx reverse proxy
- [ ] تنظیم backup خودکار
- [ ] تنظیم monitoring
- [ ] تست کامل سیستم