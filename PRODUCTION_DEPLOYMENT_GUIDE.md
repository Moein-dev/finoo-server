# راهنمای استقرار امنیتی Finoo API در Production

## نمای کلی

این راهنما شامل تمام مراحل لازم برای استقرار تغییرات امنیتی Finoo API در محیط production است. این تغییرات شامل بهبودهای امنیتی مهمی هستند که باید با دقت اجرا شوند.

## 🚨 هشدارهای مهم

- **حتماً backup کامل از database بگیرید قبل از شروع**
- **ابتدا در محیط development/staging تست کنید**
- **در ساعات کم ترافیک اجرا کنید**
- **تیم فنی باید در دسترس باشند**

## 📋 پیش‌نیازها

### 1. دسترسی‌های لازم
- [ ] دسترسی SSH به سرور production
- [ ] دسترسی MySQL با privileges کافی
- [ ] دسترسی به کدهای application
- [ ] دسترسی به environment variables

### 2. ابزارهای مورد نیاز
- [ ] MySQL client
- [ ] Git
- [ ] Node.js و npm
- [ ] PM2 (برای restart application)

### 3. اطلاعات مورد نیاز
- [ ] Database connection details
- [ ] Application directory path
- [ ] PM2 process name
- [ ] Domain و SSL certificate info

## 🗂️ فایل‌های Migration

```
migrations/
├── deploy_production_security.sql     # اصلی‌ترین فایل - همه تغییرات
├── test_production_deployment.sql     # تست migration
├── rollback_security_enhancements.sql # rollback در صورت مشکل
└── DEPLOYMENT_GUIDE.md               # راهنمای تفصیلی
```

## 📝 مراحل استقرار

### مرحله 1: آماده‌سازی

```bash
# 1. اتصال به سرور
ssh user@your-production-server

# 2. رفتن به directory پروژه
cd /path/to/finoo-backend

# 3. Pull کردن آخرین تغییرات
git pull origin main

# 4. بررسی وضعیت فعلی
pm2 status
```

### مرحله 2: Backup Database

```bash
# ایجاد backup کامل
mysqldump -u [username] -p [database_name] > backup_before_security_$(date +%Y%m%d_%H%M%S).sql

# بررسی اندازه backup
ls -lh backup_before_security_*.sql

# کپی backup به مکان امن
cp backup_before_security_*.sql /path/to/safe/location/
```

### مرحله 3: اجرای Migration

```bash
# اجرای migration اصلی
mysql -u [username] -p [database_name] < migrations/deploy_production_security.sql

# در صورت موفقیت، اجرای تست
mysql -u [username] -p [database_name] < migrations/test_production_deployment.sql
```

### مرحله 4: بروزرسانی Environment Variables

```bash
# ویرایش فایل .env
nano .env

# اضافه کردن متغیرهای جدید (اگر نیاز باشد):
# ACCESS_TOKEN_EXPIRY=7d
# REFRESH_TOKEN_EXPIRY=15d
# OTP_LENGTH=6
# OTP_EXPIRY_MINUTES=2
# OTP_MAX_ATTEMPTS=3
# ENABLE_SECURITY_LOGGING=true
```

### مرحله 5: بروزرسانی Application

```bash
# نصب dependencies جدید (اگر هست)
npm install

# اجرای تست‌های امنیتی
npm run test

# restart application
pm2 restart finoo-backend

# بررسی logs
pm2 logs finoo-backend --lines 50
```

### مرحله 6: تست عملکرد

```bash
# تست health check
curl https://your-domain.com/api/health

# تست authentication
curl -X POST https://your-domain.com/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"09123456789"}'

# بررسی security headers
curl -I https://your-domain.com/api/health
```

## 🔍 تغییرات Database

### جداول جدید:

1. **security_events** - لاگ رویدادهای امنیتی
2. **blocked_ips** - IP های مسدود شده
3. **rate_limit_tracking** - ردیابی rate limiting

### تغییرات در جداول موجود:

**phone_verifications:**
- `is_used` (BOOLEAN) - آیا OTP استفاده شده
- `attempts` (INT) - تعداد تلاش‌های ناموفق

### Indexes جدید:
- بهبود performance برای queries امنیتی
- Indexes برای جستجوی سریع در logs

## 🔧 تنظیمات Application

### تغییرات مهم:

1. **JWT Token Expiry:**
   - Access Token: 30 روز → 7 روز
   - Refresh Token: 60 روز → 15 روز

2. **OTP Security:**
   - طول: 5 رقم → 6 رقم
   - مدت اعتبار: 5 دقیقه → 2 دقیقه
   - One-time use enforcement

3. **Rate Limiting:**
   - OTP: 3 درخواست در 5 دقیقه
   - Login: 5 تلاش در 15 دقیقه
   - General API: 100 درخواست در ساعت

4. **Security Headers:**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security

## 🚨 عیب‌یابی

### مشکلات رایج:

#### 1. خطای Foreign Key
```sql
-- بررسی وجود جدول users
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'users';
```

#### 2. خطای Column Already Exists
```sql
-- بررسی وجود ستون
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'phone_verifications' 
AND column_name = 'is_used';
```

#### 3. مشکل در Application
```bash
# بررسی logs
pm2 logs finoo-backend

# restart در صورت نیاز
pm2 restart finoo-backend
```

## 🔄 Rollback (در صورت مشکل)

```bash
# فقط در صورت مشکل جدی!
mysql -u [username] -p [database_name] < migrations/rollback_security_enhancements.sql

# بازگردانی backup
mysql -u [username] -p [database_name] < backup_before_security_YYYYMMDD_HHMMSS.sql

# restart application
pm2 restart finoo-backend
```

## ✅ چک‌لیست Post-Deployment

### بلافاصله بعد از deployment:
- [ ] Application بدون خطا راه‌اندازی شده
- [ ] Health check پاسخ می‌دهد
- [ ] Authentication کار می‌کند
- [ ] OTP ارسال و تایید می‌شود
- [ ] Security headers در response موجود هستند

### 24 ساعت بعد:
- [ ] Performance مناسب است
- [ ] Error rate طبیعی است
- [ ] Security logs نوشته می‌شوند
- [ ] Rate limiting کار می‌کند

### یک هفته بعد:
- [ ] Database performance مناسب است
- [ ] Security events لاگ می‌شوند
- [ ] Monitoring alerts کار می‌کنند

## 📞 تماس‌های اضطراری

```
Technical Lead: +98-XXX-XXX-XXXX
DevOps Team: devops@finoo.ir
Security Team: security@finoo.ir
Database Admin: dba@finoo.ir
```

## 📚 مستندات مرتبط

- `docs/security/security-best-practices.md`
- `docs/deployment/security-deployment-checklist.md`
- `docs/api/authentication.md`
- `migrations/DEPLOYMENT_GUIDE.md`

## 🔐 نکات امنیتی

1. **Secret Keys:** حتماً secret keys قوی استفاده کنید
2. **HTTPS:** تمام ترافیک باید HTTPS باشد
3. **Firewall:** فقط پورت‌های ضروری باز باشند
4. **Monitoring:** Security events را مانیتور کنید
5. **Backup:** Regular backup از database بگیرید

---

**⚠️ توجه:** این deployment تغییرات مهم امنیتی دارد. حتماً تمام مراحل را با دقت دنبال کنید و در صورت مشکل، بلافاصله rollback کنید.

**📅 آخرین بروزرسانی:** [تاریخ فعلی]
**🔄 نسخه:** 1.0