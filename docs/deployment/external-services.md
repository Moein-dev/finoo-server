# External Services و Deployment

## نمای کلی

این سند شامل راهنمای کامل تنظیم سرویس‌های خارجی، deployment و نگهداری پروژه Finoo Backend است.

## سرویس‌های خارجی

### 1. TGJU API (دریافت قیمت‌ها)

#### توضیحات
TGJU یکی از معتبرترین منابع قیمت ارز و طلا در ایران است که API عمومی برای دسترسی به قیمت‌ها ارائه می‌دهد.

#### URL های API
```javascript
const tgjuUrls = [
  "https://call1.tgju.org/ajax.json",
  "https://call3.tgju.org/ajax.json", 
  "https://call2.tgju.org/ajax.json",
  "https://call.tgju.org/ajax.json",
  "https://call4.tgju.org/ajax.json"
];
```

#### ساختار Response
```json
{
  "current": {
    "price_dollar_rl": {
      "p": "42,500",
      "d": "250", 
      "dp": "0.59",
      "dt": "1640995200"
    },
    "price_eur": {
      "p": "46,200",
      "d": "-150",
      "dp": "-0.32", 
      "dt": "1640995200"
    }
  }
}
```

#### پیاده‌سازی
```javascript
// jobs/fetchData.js
async function fetchDataWithRetry(urls, options = {}, retries = 5) {
  for (const url of urls) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, options);
        return response.data;
      } catch (error) {
        console.warn(`⚠️ Error fetching from ${url}, attempt (${i + 1}/${retries})`);
        if (i === retries - 1) {
          console.warn(`❌ Failed after ${retries} attempts for ${url}`);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  throw new Error("❌ All backup URLs failed after retries.");
}
```#### ت
نظیمات Environment
```bash
# .env
TGJU_API_URLS=https://call1.tgju.org/ajax.json,https://call2.tgju.org/ajax.json,https://call3.tgju.org/ajax.json
TGJU_TIMEOUT=10000
TGJU_RETRY_COUNT=5
TGJU_RETRY_DELAY=5000
```

#### Cron Job تنظیمات
```javascript
// اجرای هر ساعت از 8 صبح تا 11 شب
schedule.scheduleJob("0 * * * *", fetchPrices);

async function checkInRangeTime() {
  const now = moment().tz("Asia/Tehran");
  const hour = now.hour();
  return hour >= 8 && hour <= 23;
}
```

#### Error Handling
```javascript
try {
  const tgjuResponse = await fetchDataWithRetry(tgjuUrls, {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,fa;q=0.8",
    },
    timeout: 10000
  });
} catch (error) {
  console.error("❌ Error fetching TGJU data:", error.message);
  // ارسال alert به monitoring system
  sendAlert('TGJU API Failed', error.message);
}
```

---

### 2. SMS Service (Trez.ir)

#### توضیحات
سرویس ارسال پیامک برای تایید شماره موبایل کاربران.

#### تنظیمات
```bash
# .env
SMS_USERNAME=your_sms_username
SMS_PASSWORD=your_sms_password
SMS_API_URL=http://smspanel.Trez.ir/SendMessageWithCode.ashx
SMS_TIMEOUT=10000
```

#### پیاده‌سازی
```javascript
// helpers/smsHelper.js
async function sendSMS(phone, message) {
  try {
    const params = new URLSearchParams();
    params.append("Username", process.env.SMS_USERNAME);
    params.append("Password", process.env.SMS_PASSWORD);
    params.append("Mobile", phone);
    params.append("Message", message);

    const response = await axios.post(
      process.env.SMS_API_URL,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: parseInt(process.env.SMS_TIMEOUT) || 10000
      }
    );

    console.log("📤 SMS sent successfully:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ SMS sending failed:", error.message);
    
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: "SMS service timeout" };
    } else if (error.response && error.response.status === 401) {
      return { success: false, error: "SMS service authentication failed" };
    } else {
      return { success: false, error: "SMS service unavailable" };
    }
  }
}
```

#### Rate Limiting برای SMS
```javascript
// محدودیت 3 SMS در 5 دقیقه برای هر کاربر
async function checkSMSRateLimit(userId) {
  const count = await countPhoneVerificationsLast5Minutes(userId);
  if (count >= 3) {
    throw new Error("تعداد درخواست‌های شما بیش از حد مجاز است");
  }
}
```

#### Monitoring SMS Service
```javascript
// Health check برای SMS service
async function checkSMSHealth() {
  try {
    // ارسال SMS تست به شماره مخصوص
    const testResult = await sendSMS(process.env.TEST_PHONE, "Health Check");
    return testResult.success;
  } catch (error) {
    return false;
  }
}
```

---

### 3. Email Service (Gmail SMTP)

#### تنظیمات
```bash
# .env
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password  # App Password از Gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
```

#### پیاده‌سازی
```javascript
// helpers/emailHelper.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransporter({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendVerificationEmail(to, token) {
  const verifyLink = `https://finoo.ir/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Finoo App" <${process.env.MAIL_USER}>`,
    to,
    subject: "تایید ایمیل - اپلیکیشن فینو",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>تایید ایمیل</h2>
        <p>برای تایید ایمیل خود روی لینک زیر کلیک کنید:</p>
        <a href="${verifyLink}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          تایید ایمیل
        </a>
        <p>اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return { success: false, error: error.message };
  }
}
```

#### تست Email Service
```javascript
// Test email configuration
async function testEmailService() {
  try {
    await transporter.verify();
    console.log("✅ Email service is ready");
    return true;
  } catch (error) {
    console.error("❌ Email service error:", error);
    return false;
  }
}
```

---

## Deployment Strategies

### 1. Manual Deployment

#### مراحل Deployment دستی
```bash
# 1. اتصال به سرور
ssh user@your-server.com

# 2. رفتن به پوشه پروژه
cd /var/www/finoo-backend

# 3. Backup فایل‌های مهم
cp .env .env.backup
mysqldump -u finoo_user -p finoo_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Pull آخرین تغییرات
git pull origin main

# 5. نصب dependencies جدید
npm install --production

# 6. اجرای migrations (در صورت وجود)
npm run db:migrate

# 7. Restart سرویس
pm2 restart finoo-backend

# 8. بررسی وضعیت
pm2 status
pm2 logs finoo-backend --lines 50
```

#### اسکریپت Deployment
```bash
#!/bin/bash
# deploy.sh

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Variables
PROJECT_DIR="/var/www/finoo-backend"
BACKUP_DIR="/var/backups/finoo"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "📦 Creating database backup..."
mysqldump -u finoo_user -p$DB_PASSWORD finoo_db > $BACKUP_DIR/db_backup_$DATE.sql

# Backup current code
echo "📦 Creating code backup..."
tar -czf $BACKUP_DIR/code_backup_$DATE.tar.gz -C $PROJECT_DIR .

# Pull latest code
echo "📥 Pulling latest code..."
cd $PROJECT_DIR
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Run migrations
echo "🔄 Running migrations..."
npm run db:migrate

# Restart application
echo "🔄 Restarting application..."
pm2 restart finoo-backend

# Health check
echo "🏥 Running health check..."
sleep 5
curl -f http://localhost:3000/health || {
  echo "❌ Health check failed! Rolling back..."
  pm2 restart finoo-backend
  exit 1
}

echo "✅ Deployment completed successfully!"
```

### 2. CI/CD Pipeline (GitHub Actions)

#### فایل `.github/workflows/deploy.yml`
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: finoo_test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_USER: root
        DB_PASSWORD: root
        DB_NAME: finoo_test
        SECRET_KEY: test-secret-key
        REFRESH_SECRET_KEY: test-refresh-secret-key

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/finoo-backend
          git pull origin main
          npm install --production
          pm2 restart finoo-backend
          sleep 5
          curl -f http://localhost:3000/health
```

### 3. Docker Deployment

#### Multi-stage Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S finoo -u 1001

# Copy dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY --chown=finoo:nodejs . .

# Create necessary directories
RUN mkdir -p uploads logs && chown -R finoo:nodejs uploads logs

USER finoo

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

#### Docker Compose برای Production
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
      - .env.production
    depends_on:
      - mysql
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
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
      - ./mysql/init:/docker-entrypoint-initdb.d
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    networks:
      - finoo-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
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
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
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

---

## Monitoring و Alerting

### 1. Application Monitoring

#### Performance Metrics
```javascript
// middlewares/metricsMiddleware.js
const metrics = {
  requests: 0,
  errors: 0,
  responseTime: [],
  activeConnections: 0
};

function collectMetrics(req, res, next) {
  const start = Date.now();
  metrics.requests++;
  metrics.activeConnections++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.responseTime.push(duration);
    metrics.activeConnections--;
    
    if (res.statusCode >= 400) {
      metrics.errors++;
    }
    
    // Keep only last 1000 response times
    if (metrics.responseTime.length > 1000) {
      metrics.responseTime = metrics.responseTime.slice(-1000);
    }
  });

  next();
}

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const avgResponseTime = metrics.responseTime.length > 0 
    ? metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length 
    : 0;

  res.json({
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) : 0,
    avgResponseTime: Math.round(avgResponseTime),
    activeConnections: metrics.activeConnections,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});
```

### 2. External Service Monitoring

#### Health Check برای External Services
```javascript
// utils/healthChecker.js
async function checkExternalServices() {
  const services = {
    tgju: false,
    sms: false,
    email: false,
    database: false
  };

  // Check TGJU API
  try {
    const response = await axios.get('https://call1.tgju.org/ajax.json', { timeout: 5000 });
    services.tgju = response.status === 200;
  } catch (error) {
    services.tgju = false;
  }

  // Check SMS Service
  services.sms = await checkSMSHealth();

  // Check Email Service
  services.email = await testEmailService();

  // Check Database
  try {
    await db.query('SELECT 1');
    services.database = true;
  } catch (error) {
    services.database = false;
  }

  return services;
}

// Health check endpoint
app.get('/health/external', async (req, res) => {
  const services = await checkExternalServices();
  const allHealthy = Object.values(services).every(status => status);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    services,
    timestamp: new Date().toISOString()
  });
});
```

### 3. Alerting System

#### Simple Alert System
```javascript
// utils/alerting.js
const alerts = {
  email: [],
  sms: [],
  webhook: []
};

async function sendAlert(type, message, severity = 'warning') {
  const alert = {
    type,
    message,
    severity,
    timestamp: new Date().toISOString(),
    hostname: require('os').hostname()
  };

  console.error(`🚨 ALERT [${severity.toUpperCase()}]: ${type} - ${message}`);

  // Send to webhook (Slack, Discord, etc.)
  if (process.env.ALERT_WEBHOOK_URL) {
    try {
      await axios.post(process.env.ALERT_WEBHOOK_URL, {
        text: `🚨 Finoo Backend Alert: ${type}\n${message}\nSeverity: ${severity}\nTime: ${alert.timestamp}`
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error.message);
    }
  }

  // Send email alert for critical issues
  if (severity === 'critical' && process.env.ALERT_EMAIL) {
    try {
      await sendEmail(process.env.ALERT_EMAIL, `Critical Alert: ${type}`, message);
    } catch (error) {
      console.error('Failed to send email alert:', error.message);
    }
  }
}

// Usage examples
// sendAlert('Database Connection Failed', 'Unable to connect to MySQL', 'critical');
// sendAlert('High Response Time', 'Average response time > 2000ms', 'warning');
// sendAlert('External API Failed', 'TGJU API is not responding', 'error');
```

---

## Backup و Recovery

### 1. Database Backup

#### اسکریپت Backup خودکار
```bash
#!/bin/bash
# scripts/backup-db.sh

# Variables
DB_USER="finoo_user"
DB_PASS="$DB_PASSWORD"
DB_NAME="finoo_db"
BACKUP_DIR="/var/backups/finoo/db"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
echo "Creating database backup..."
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/finoo_db_$DATE.sql.gz

# Remove old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "finoo_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: finoo_db_$DATE.sql.gz"
```

#### Cron Job برای Backup
```bash
# اضافه کردن به crontab
crontab -e

# Backup هر روز ساعت 2 صبح
0 2 * * * /var/www/finoo-backend/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### 2. File Backup

#### Backup فایل‌های آپلود شده
```bash
#!/bin/bash
# scripts/backup-files.sh

UPLOAD_DIR="/var/www/finoo-backend/uploads"
BACKUP_DIR="/var/backups/finoo/files"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $UPLOAD_DIR .

# Remove old backups (keep 7 days)
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "File backup completed: uploads_$DATE.tar.gz"
```

### 3. Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# scripts/restore-db.sh

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE=$1
DB_USER="finoo_user"
DB_PASS="$DB_PASSWORD"
DB_NAME="finoo_db"

echo "Restoring database from $BACKUP_FILE..."

# Stop application
pm2 stop finoo-backend

# Restore database
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | mysql -u $DB_USER -p$DB_PASS $DB_NAME
else
  mysql -u $DB_USER -p$DB_PASS $DB_NAME < $BACKUP_FILE
fi

# Start application
pm2 start finoo-backend

echo "Database restore completed"
```

---

## Security Considerations

### 1. Server Security

#### Firewall تنظیمات
```bash
# UFW Firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### SSL Certificate (Let's Encrypt)
```bash
# نصب Certbot
sudo apt install certbot python3-certbot-nginx

# دریافت certificate
sudo certbot --nginx -d finoo.ir -d www.finoo.ir

# Auto renewal
sudo crontab -e
# اضافه کردن خط زیر:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Application Security

#### Security Headers
```javascript
// middlewares/securityMiddleware.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### Rate Limiting Global
```javascript
const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
```

---

## Performance Optimization

### 1. Database Optimization

#### Index Optimization
```sql
-- بررسی کارایی query ها
EXPLAIN SELECT * FROM new_prices WHERE currency_id = 1 ORDER BY created_at DESC LIMIT 10;

-- اضافه کردن index های مفید
CREATE INDEX idx_currency_created_desc ON new_prices(currency_id, created_at DESC);
CREATE INDEX idx_phone_verifications_expires ON phone_verifications(expires_at);
```

#### Query Optimization
```javascript
// بهینه‌سازی query های پرکاربرد
async function getLatestPricesOptimized() {
  const query = `
    SELECT np.*, c.name, c.symbol, c.icon, c.color, c.priority
    FROM new_prices np
    INNER JOIN (
      SELECT currency_id, MAX(created_at) as max_date
      FROM new_prices
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY currency_id
    ) latest ON np.currency_id = latest.currency_id 
      AND np.created_at = latest.max_date
    INNER JOIN currencies c ON np.currency_id = c.id
    ORDER BY c.priority ASC
  `;
  
  const [rows] = await db.query(query);
  return rows;
}
```

### 2. Caching Strategy

#### Redis Caching
```javascript
// utils/cache.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

async function getFromCache(key) {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

async function setCache(key, data, ttl = 300) {
  try {
    await client.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

// استفاده در controller
async function getCachedPrices(req, res) {
  const cacheKey = `prices:${req.query.date || 'today'}`;
  
  let prices = await getFromCache(cacheKey);
  if (!prices) {
    prices = await getDataByDate(req.query.date);
    await setCache(cacheKey, prices, 300); // 5 minutes
  }
  
  return sendSuccessResponse(res, prices);
}
```

---

## Troubleshooting Guide

### مشکلات رایج و راه‌حل‌ها

#### 1. Database Connection Issues
```bash
# بررسی وضعیت MySQL
sudo systemctl status mysql

# بررسی logs
sudo tail -f /var/log/mysql/error.log

# تست اتصال
mysql -u finoo_user -p -h localhost finoo_db
```

#### 2. High Memory Usage
```bash
# بررسی memory usage
free -h
ps aux --sort=-%mem | head

# Restart PM2 processes
pm2 restart all
```

#### 3. SSL Certificate Issues
```bash
# بررسی certificate
sudo certbot certificates

# تمدید دستی
sudo certbot renew

# تست SSL
curl -I https://finoo.ir
```

#### 4. External API Failures
```javascript
// تست TGJU API
curl -H "Accept: application/json" https://call1.tgju.org/ajax.json

// بررسی logs
pm2 logs finoo-backend | grep "TGJU"
```

### Log Analysis

#### مفید ترین دستورات Log
```bash
# آخرین 100 خط log
pm2 logs finoo-backend --lines 100

# فیلتر کردن خطاها
pm2 logs finoo-backend | grep "ERROR"

# مشاهده real-time logs
pm2 logs finoo-backend --follow

# Log های مربوط به API خاص
pm2 logs finoo-backend | grep "/api/auth"
```

## چک‌لیست Deployment

### Pre-deployment
- [ ] تست کامل در محیط staging
- [ ] بررسی security vulnerabilities
- [ ] Backup دیتابیس و فایل‌ها
- [ ] بررسی disk space
- [ ] تست external services

### During Deployment
- [ ] اجرای deployment script
- [ ] مانیتور کردن logs
- [ ] تست health check endpoints
- [ ] بررسی performance metrics

### Post-deployment
- [ ] تست کامل تمام endpoints
- [ ] بررسی monitoring dashboards
- [ ] تایید backup های جدید
- [ ] اطلاع‌رسانی به تیم
- [ ] مستندسازی تغییرات