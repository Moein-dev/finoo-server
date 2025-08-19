# سازماندهی فایل‌ها و قراردادهای نام‌گذاری

## نمای کلی

این سند شامل راهنمای کامل سازماندهی فایل‌ها، قراردادهای نام‌گذاری و بهترین روش‌های توسعه در پروژه Finoo Backend است.

## ساختار کلی پروژه

```
finoo-backend/
├── 📁 config/                 # تنظیمات و پیکربندی‌ها
│   └── db.js                  # پیکربندی دیتابیس
├── 📁 controllers/            # کنترلرهای API
│   ├── authController.js      # کنترلر احراز هویت
│   └── profileController.js   # کنترلر پروفایل کاربر
├── 📁 middlewares/            # میان‌افزارها
│   └── authMiddleware.js      # میان‌افزار احراز هویت
├── 📁 models/                 # مدل‌های داده
│   ├── userModel.js           # مدل کاربر
│   ├── priceModel.js          # مدل قیمت
│   ├── currencyModel.js       # مدل ارز
│   └── categoryModel.js       # مدل دسته‌بندی
├── 📁 routes/                 # مسیرهای API
│   ├── authRoutes.js          # مسیرهای احراز هویت
│   └── dataRoutes.js          # مسیرهای داده
├── 📁 services/               # لایه سرویس
│   └── databaseService.js     # سرویس دیتابیس
├── 📁 helpers/                # توابع کمکی
│   ├── smsHelper.js           # کمکی SMS
│   └── emailHelper.js         # کمکی ایمیل
├── 📁 utils/                  # ابزارهای عمومی
│   └── responseHandler.js     # مدیریت پاسخ‌ها
├── 📁 jobs/                   # کارهای پس‌زمینه
│   └── fetchData.js           # دریافت داده از API خارجی
├── 📁 public/                 # فایل‌های عمومی
│   └── icons/                 # آیکن‌های ارزها
├── 📁 uploads/                # فایل‌های آپلود شده
├── 📁 docs/                   # مستندات پروژه
│   ├── api/                   # مستندات API
│   ├── architecture/          # مستندات معماری
│   ├── database/              # مستندات دیتابیس
│   └── development/           # راهنمای توسعه
├── 📄 server.js               # نقطه ورود اصلی
├── 📄 package.json            # وابستگی‌ها و اسکریپت‌ها
├── 📄 .env.example            # نمونه متغیرهای محیطی
├── 📄 .gitignore              # فایل‌های نادیده گرفته شده
└── 📄 README.md               # راهنمای پروژه
```

## قراردادهای نام‌گذاری

### 1. فایل‌ها و پوشه‌ها

#### پوشه‌ها
- **camelCase** برای نام پوشه‌ها: `controllers/`, `middlewares/`, `services/`
- **جمع** برای پوشه‌هایی که شامل چندین فایل مشابه هستند
- **منفرد** برای پوشه‌هایی که شامل یک نوع خاص هستند

```
✅ درست:
controllers/
models/
helpers/
utils/

❌ غلط:
Controllers/
controller/
Helper/
```

#### فایل‌ها
- **camelCase** برای فایل‌های JavaScript: `authController.js`, `userModel.js`
- **kebab-case** برای فایل‌های مستندات: `file-organization.md`
- **پسوند مناسب** برای نوع فایل: `.js`, `.md`, `.json`

```
✅ درست:
authController.js
userModel.js
databaseService.js
file-organization.md

❌ غلط:
AuthController.js
user_model.js
database-service.js
fileorganization.md
```

### 2. کلاس‌ها و Constructor ها

- **PascalCase** برای نام کلاس‌ها
- **نام توصیفی** که نقش کلاس را مشخص کند
- **پسوند مناسب** برای نوع کلاس

```javascript
✅ درست:
class UserModel { }
class AuthController { }
class DatabaseService { }
class CategoryModel { }

❌ غلط:
class userModel { }
class authcontroller { }
class database_service { }
class category { }
```

### 3. توابع و متدها

- **camelCase** برای نام توابع
- **فعل** در ابتدای نام برای توابع عملیاتی
- **نام توصیفی** که عملکرد تابع را مشخص کند

```javascript
✅ درست:
function createUser() { }
function getUserByUsername() { }
function updateUserProfile() { }
function validateInput() { }
async function sendVerificationEmail() { }

❌ غلط:
function CreateUser() { }
function get_user() { }
function user() { }
function validate() { }
```

### 4. متغیرها

- **camelCase** برای متغیرهای معمولی
- **UPPER_SNAKE_CASE** برای ثابت‌ها
- **نام توصیفی** و معنادار

```javascript
✅ درست:
const userName = 'john_doe';
const accessToken = 'jwt_token';
const MAX_RETRY_COUNT = 5;
const DATABASE_URL = process.env.DB_URL;

❌ غلط:
const username = 'john_doe';
const token = 'jwt_token';
const maxRetryCount = 5;
const db_url = process.env.DB_URL;
```

### 5. Route ها و Endpoint ها

- **kebab-case** برای URL path ها
- **جمع** برای منابع
- **RESTful** naming conventions

```javascript
✅ درست:
/api/auth/register
/api/auth/send-code
/api/auth/verify-code
/api/prices
/api/prices/range
/api/symbols

❌ غلط:
/api/auth/Register
/api/auth/sendCode
/api/auth/verify_code
/api/price
/api/pricesRange
/api/symbol
```

## سازماندهی کد در فایل‌ها

### 1. ساختار فایل Controller

```javascript
// 📁 controllers/authController.js

// 1. Import های خارجی
const jwt = require("jsonwebtoken");

// 2. Import های داخلی
const {
  createUser,
  getUserByUsername,
  // ...
} = require("../services/databaseService");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const { sendSMS } = require("../helpers/smsHelper");

// 3. توابع کمکی محلی
function generateRandomUsername() {
  return `user_${Math.floor(Math.random() * 1000000)}`;
}

// 4. توابع اصلی Controller (به ترتیب اهمیت)
exports.register = async (req, res) => {
  // پیاده‌سازی
};

exports.login = async (req, res) => {
  // پیاده‌سازی
};

exports.requestLoginOtp = async (req, res) => {
  // پیاده‌سازی
};

// 5. سایر توابع...
```

### 2. ساختار فایل Model

```javascript
// 📁 models/userModel.js

// 1. Import های مورد نیاز (در صورت وجود)

// 2. تعریف کلاس
class UserModel {
    // 3. Constructor
    constructor({
        id,
        username,
        // سایر فیلدها...
    }) {
        this.id = id;
        this.username = username;
        // مقداردهی سایر فیلدها...
    }

    // 4. Static methods
    static fromDatabase(row) {
        // پیاده‌سازی
    }

    // 5. Instance methods
    toJSON() {
        // پیاده‌سازی
    }

    toProfileJSON() {
        // پیاده‌سازی
    }
}

// 6. Export
module.exports = UserModel;
```

### 3. ساختار فایل Service

```javascript
// 📁 services/databaseService.js

// 1. Import ها
const db = require("../config/db");
const UserModel = require("../models/userModel");
// سایر import ها...

// 2. توابع کمکی محلی
async function findCurrencyId(serverKey) {
  // پیاده‌سازی
}

// 3. توابع اصلی (گروه‌بندی شده بر اساس عملکرد)

// === User Management Functions ===
async function createUser(username, name = null) {
  // پیاده‌سازی
}

async function getUserByUsername(username) {
  // پیاده‌سازی
}

// === Price Management Functions ===
async function getDataByDate(date, lastPrice, limit, offset) {
  // پیاده‌سازی
}

async function insertPrice(name, serverKey, price, date, bubblePercent = null) {
  // پیاده‌سازی
}

// 4. Export تمام توابع
module.exports = {
  // User functions
  createUser,
  getUserByUsername,
  // Price functions
  getDataByDate,
  insertPrice,
  // سایر توابع...
};
```

### 4. ساختار فایل Route

```javascript
// 📁 routes/authRoutes.js

// 1. Import های خارجی
const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

// 2. Import های داخلی
const authenticateToken = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");

// 3. تنظیمات Router
const router = express.Router();

// 4. تنظیمات Middleware (در صورت نیاز)
const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: {
    status: "error",
    message: "تلاش برای ثبت نام بسیار زیاد است، لطفاً بعداً دوباره امتحان کنید.",
  },
});

// 5. تعریف Route ها (به ترتیب منطقی)
router.post("/register", registerLimiter, authController.register);
router.post("/login", authController.login);
router.post("/send-code", authController.requestLoginOtp);
router.post("/verify-code", authController.loginWithOtp);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

// 6. Export
module.exports = router;
```

## قراردادهای کامنت‌گذاری

### 1. کامنت‌های فایل

```javascript
/**
 * Auth Controller
 * 
 * مدیریت احراز هویت کاربران شامل ثبت نام، ورود، OTP و مدیریت token ها
 * 
 * @author Finoo Team
 * @version 1.0.0
 */
```

### 2. کامنت‌های تابع

```javascript
/**
 * ایجاد کاربر جدید در سیستم
 * 
 * @param {string} username - نام کاربری (اختیاری، در صورت عدم ارسال خودکار تولید می‌شود)
 * @param {string} name - نام نمایشی کاربر (اختیاری)
 * @returns {Promise<Object>} نتیجه عملیات insert
 * @throws {Error} در صورت خطا در دیتابیس
 */
async function createUser(username, name = null) {
  // پیاده‌سازی
}
```

### 3. کامنت‌های بخش

```javascript
// 📌 **ثبت‌نام کاربر جدید (بدون تولید توکن)**
router.post("/register", registerLimiter, authController.register);

// 📌 **ورود کاربر (Login) و تولید `accessToken` + `refreshToken`**
router.post("/login", authController.login);

// === User Management Functions ===
// توابع مربوط به مدیریت کاربران

// === Price Management Functions ===
// توابع مربوط به مدیریت قیمت‌ها
```

### 4. کامنت‌های TODO و FIXME

```javascript
// TODO: اضافه کردن validation برای شماره موبایل
// FIXME: مدیریت بهتر خطاهای دیتابیس
// NOTE: این تابع فقط برای testing استفاده می‌شود
// HACK: راه حل موقت - باید بعداً بهبود یابد
```

## قراردادهای Git

### 1. نام‌گذاری Branch ها

```
✅ درست:
feature/user-authentication
feature/price-api
bugfix/database-connection
hotfix/security-patch
release/v1.2.0

❌ غلط:
UserAuthentication
price_api
bug-fix
hotFix
```

### 2. پیام‌های Commit

```
✅ درست:
feat: add user authentication with OTP
fix: resolve database connection timeout
docs: update API documentation
refactor: improve error handling in controllers
test: add unit tests for user model

❌ غلط:
Added user auth
Fixed bug
Updated docs
Refactored code
```

### 3. ساختار Commit Message

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**انواع Type:**
- `feat`: ویژگی جدید
- `fix`: رفع باگ
- `docs`: تغییرات مستندات
- `style`: تغییرات فرمت کد
- `refactor`: بازنویسی کد
- `test`: اضافه کردن تست
- `chore`: کارهای نگهداری

## بهترین روش‌ها

### 1. سازماندهی Import ها

```javascript
// 1. Node.js built-in modules
const path = require('path');
const fs = require('fs');

// 2. Third-party modules
const express = require('express');
const jwt = require('jsonwebtoken');

// 3. Local modules (به ترتیب عمق)
const config = require('./config');
const { sendSMS } = require('../helpers/smsHelper');
const UserModel = require('../models/userModel');
```

### 2. Export Pattern

```javascript
// ✅ درست: Named exports برای چندین تابع
module.exports = {
  createUser,
  getUserByUsername,
  updateUserProfile,
};

// ✅ درست: Default export برای کلاس‌ها
module.exports = UserModel;

// ✅ درست: Individual exports
exports.register = async (req, res) => { };
exports.login = async (req, res) => { };
```

### 3. Error Handling

```javascript
// ✅ درست: مدیریت خطا با try-catch
try {
  const user = await createUser(username, name);
  return sendSuccessResponse(res, user);
} catch (error) {
  console.error('❌ Error creating user:', error);
  return sendErrorResponse(res, 500, 'خطا در ایجاد کاربر');
}
```

### 4. Async/Await Usage

```javascript
// ✅ درست: استفاده از async/await
async function getUserData(userId) {
  const user = await getUserById(userId);
  const profile = await getProfileData(userId);
  return { user, profile };
}

// ❌ غلط: استفاده از callback
function getUserData(userId, callback) {
  getUserById(userId, (err, user) => {
    if (err) return callback(err);
    // ...
  });
}
```

### 5. Environment Variables

```javascript
// ✅ درست: استفاده از متغیرهای محیطی
const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  SECRET_KEY,
  REFRESH_SECRET_KEY
} = process.env;

// بررسی وجود متغیرهای ضروری
if (!DB_HOST || !DB_USER || !SECRET_KEY) {
  console.error("❌ Required environment variables are missing!");
  process.exit(1);
}
```

## چک‌لیست کیفیت کد

### قبل از Commit:

- [ ] نام‌گذاری فایل‌ها و توابع مطابق قراردادها
- [ ] کامنت‌گذاری مناسب برای توابع پیچیده
- [ ] حذف console.log های غیرضروری
- [ ] بررسی syntax errors
- [ ] تست عملکرد تغییرات
- [ ] بروزرسانی مستندات در صورت نیاز

### قبل از Push:

- [ ] بررسی conflict ها
- [ ] تست کامل عملکرد
- [ ] بررسی security issues
- [ ] بهینه‌سازی performance
- [ ] بررسی backward compatibility