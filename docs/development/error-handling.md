# مدیریت خطا و الگوهای Response

## نمای کلی

این سند شامل راهنمای کامل مدیریت خطاها، الگوهای پاسخ‌دهی و بهترین روش‌های error handling در پروژه Finoo Backend است.

## فلسفه Error Handling

### اصول کلی
1. **Fail Fast**: خطاها باید در اسرع وقت شناسایی و مدیریت شوند
2. **Graceful Degradation**: سیستم باید در مواجهه با خطا به صورت مناسب عمل کند
3. **User-Friendly Messages**: پیام‌های خطا باید برای کاربر قابل فهم باشند
4. **Detailed Logging**: خطاها باید برای توسعه‌دهندگان به تفصیل log شوند
5. **Security First**: اطلاعات حساس نباید در پیام‌های خطا افشا شوند

## ساختار Response استاندارد

### Response موفق (Success)

```javascript
{
  "status": 200,
  "data": <actual_data>,
  "links": {
    "self": "<current_request_url>",
    "next": "<next_page_url>",     // اختیاری
    "prev": "<previous_page_url>"  // اختیاری
  },
  "meta": {                        // اختیاری
    "totalRecords": 150,
    "totalPages": 15,
    "currentPage": 1,
    "limitPerPage": 10
  }
}
```

### Response خطا (Error)

```javascript
{
  "status": <http_status_code>,
  "error": "<user_friendly_error_message>",
  "code": "<internal_error_code>",     // اختیاری
  "details": {                         // اختیاری - فقط در development
    "field": "validation_error_details"
  }
}
```

## Response Handler Utility

### فایل: `utils/responseHandler.js`

```javascript
/**
 * ارسال پاسخ موفق
 * @param {Object} res - Express response object
 * @param {*} data - داده‌های پاسخ
 * @param {Object} links - لینک‌های مربوطه (اختیاری)
 * @param {Object} meta - metadata (اختیاری)
 * @returns {Object} JSON response
 */
function sendSuccessResponse(res, data, links = null, meta = null) {
  const response = { status: 200, data, links, meta };
  
  // حذف فیلدهای خالی
  if (!links || Object.keys(links).length === 0) delete response.links;
  if (!meta || Object.keys(meta).length === 0) delete response.meta;
  
  return res.status(200).json(response);
}

/**
 * ارسال پاسخ خطا
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string|Error} error - پیام خطا یا Error object
 * @param {string} code - کد خطای داخلی (اختیاری)
 * @param {Object} details - جزئیات خطا (اختیاری)
 * @returns {Object} JSON response
 */
function sendErrorResponse(res, statusCode, error, code = null, details = null) {
  // Log کردن خطا برای debugging
  console.error(`❌ Error ${statusCode}:`, error);
  
  const response = {
    status: statusCode,
    error: error.message || error
  };
  
  // اضافه کردن فیلدهای اختیاری
  if (code) response.code = code;
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

module.exports = { sendSuccessResponse, sendErrorResponse };
```

## انواع خطاها و مدیریت آن‌ها

### 1. خطاهای Validation

#### مثال: اعتبارسنجی ورودی

```javascript
// در Controller
exports.login = async (req, res) => {
  const { username } = req.body;

  // بررسی وجود فیلد الزامی
  if (!username || username.trim() === "") {
    return sendErrorResponse(res, 400, "نام کاربری مورد نیاز است", "MISSING_USERNAME");
  }

  // بررسی طول نام کاربری
  if (username.length < 3) {
    return sendErrorResponse(res, 400, "نام کاربری باید حداقل 3 کاراکتر باشد", "INVALID_USERNAME_LENGTH");
  }

  try {
    // ادامه منطق...
  } catch (error) {
    return sendErrorResponse(res, 500, "خطا در ورود کاربر");
  }
};
```

#### Validation Helper Function

```javascript
// utils/validation.js
function validatePhoneNumber(phone) {
  const phoneRegex = /^09[0-9]{9}$/;
  if (!phone) {
    throw new Error("شماره تلفن الزامی است");
  }
  if (!phoneRegex.test(phone)) {
    throw new Error("فرمت شماره تلفن صحیح نیست");
  }
  return true;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    throw new Error("فرمت ایمیل صحیح نیست");
  }
  return true;
}

// استفاده در Controller
try {
  validatePhoneNumber(req.body.phone);
  // ادامه منطق...
} catch (error) {
  return sendErrorResponse(res, 400, error.message, "VALIDATION_ERROR");
}
```

### 2. خطاهای Database

#### Connection Errors

```javascript
// config/db.js
async function pingDatabase() {
    try {
        const [rows] = await db.query("SELECT 1");
        console.log("✅ Database connection is active.");
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        
        // در production، سرور را متوقف کن
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        
        throw new Error("Database connection failed");
    }
}
```

#### Query Errors

```javascript
// services/databaseService.js
async function getUserByUsername(username) {
  try {
    const [rows] = await db.query(
      `SELECT id, username, email, phone, name FROM users WHERE username = ?`,
      [username]
    );
    return rows[0] ? UserModel.fromDatabase(rows[0]) : null;
  } catch (error) {
    console.error("❌ Database query error:", error);
    
    // تشخیص نوع خطا
    if (error.code === 'ER_NO_SUCH_TABLE') {
      throw new Error("Database table not found");
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error("Database access denied");
    } else {
      throw new Error("Database operation failed");
    }
  }
}

// استفاده در Controller
try {
  const user = await getUserByUsername(username);
  if (!user) {
    return sendErrorResponse(res, 404, "کاربر یافت نشد", "USER_NOT_FOUND");
  }
  // ادامه منطق...
} catch (error) {
  if (error.message.includes("Database")) {
    return sendErrorResponse(res, 500, "خطا در دسترسی به دیتابیس");
  }
  return sendErrorResponse(res, 500, "خطای داخلی سرور");
}
```

### 3. خطاهای Authentication

#### JWT Token Errors

```javascript
// middlewares/authMiddleware.js
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return sendErrorResponse(res, 401, "کد دسترسی مورد نیاز است", "MISSING_TOKEN");
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            // تشخیص نوع خطای JWT
            if (err.name === 'TokenExpiredError') {
                return sendErrorResponse(res, 403, "کد دسترسی منقضی شده است", "TOKEN_EXPIRED");
            } else if (err.name === 'JsonWebTokenError') {
                return sendErrorResponse(res, 403, "کد دسترسی نامعتبر است", "INVALID_TOKEN");
            } else {
                return sendErrorResponse(res, 403, "خطا در اعتبارسنجی کد دسترسی", "TOKEN_ERROR");
            }
        }

        req.user = user;
        next();
    });
}
```

#### OTP Verification Errors

```javascript
// controllers/authController.js
exports.loginWithOtp = async (req, res) => {
  const { phone, code } = req.body;

  // Validation
  if (!phone || !code) {
    return sendErrorResponse(res, 400, "شماره و کد الزامی هستند", "MISSING_FIELDS");
  }

  try {
    const user = await getUserByPhone(phone);
    if (!user) {
      return sendErrorResponse(res, 404, "کاربر یافت نشد", "USER_NOT_FOUND");
    }

    const verification = await getPhoneVerification(user.id, phone);
    if (!verification) {
      return sendErrorResponse(res, 400, "کد تایید یافت نشد", "VERIFICATION_NOT_FOUND");
    }

    if (verification.code !== code) {
      return sendErrorResponse(res, 400, "کد اشتباه است", "INVALID_CODE");
    }

    if (new Date(verification.expires_at) < new Date()) {
      return sendErrorResponse(res, 400, "کد منقضی شده است", "CODE_EXPIRED");
    }

    // ادامه منطق موفق...
  } catch (error) {
    console.error("❌ loginWithOtp error:", error);
    return sendErrorResponse(res, 500, "خطا در ورود با OTP");
  }
};
```

### 4. خطاهای External Services

#### SMS Service Errors

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
      "http://smspanel.Trez.ir/SendMessageWithCode.ashx",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log("📤 SMS sent successfully:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ SMS sending failed:", error.message);
    
    // تشخیص نوع خطا
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: "SMS service timeout" };
    } else if (error.response && error.response.status === 401) {
      return { success: false, error: "SMS service authentication failed" };
    } else {
      return { success: false, error: "SMS service unavailable" };
    }
  }
}

// استفاده در Controller
const smsResult = await sendSMS(phone, `کد ورود: ${code}`);
if (!smsResult.success) {
  console.error("SMS Error:", smsResult.error);
  return sendErrorResponse(res, 500, "ارسال پیامک با خطا مواجه شد", "SMS_FAILED");
}
```

#### TGJU API Errors

```javascript
// jobs/fetchData.js
async function fetchDataWithRetry(urls, options = {}, retries = 5) {
  let lastError;
  
  for (const url of urls) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          ...options,
          timeout: 10000
        });
        console.log(`✅ Success fetching from: ${url}`);
        return response.data;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Error fetching from ${url}, attempt (${i + 1}/${retries}):`, error.message);
        
        // اگر آخرین تلاش نبود، صبر کن
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
  }
  
  throw new Error(`❌ All backup URLs failed after retries. Last error: ${lastError.message}`);
}
```

### 5. خطاهای File Upload

```javascript
// routes/authRoutes.js
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  const allowedExtensions = [".jpeg", ".jpg", ".png"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    !allowedTypes.includes(file.mimetype) ||
    !allowedExtensions.includes(fileExtension)
  ) {
    return cb(
      new Error("نوع فایل نامعتبر است. فقط JPEG، PNG و JPG مجاز هستند."),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Error handling برای multer
router.post("/update-profile", authenticateToken, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendErrorResponse(res, 400, "حجم فایل بیش از حد مجاز است", "FILE_TOO_LARGE");
      }
      return sendErrorResponse(res, 400, "خطا در آپلود فایل", "UPLOAD_ERROR");
    } else if (err) {
      return sendErrorResponse(res, 400, err.message, "FILE_VALIDATION_ERROR");
    }
    next();
  });
}, profileController.updateProfile);
```

## Global Error Handler

### Express Error Handling Middleware

```javascript
// server.js
// 📌 مدیریت خطاهای عمومی (Error Handling Middleware)
app.use((err, req, res, next) => {
    console.error("❌ Internal Server Error:", err);
    
    // تشخیص نوع خطا
    if (err.name === 'ValidationError') {
        return sendErrorResponse(res, 400, "خطا در اعتبارسنجی داده‌ها", "VALIDATION_ERROR");
    } else if (err.name === 'CastError') {
        return sendErrorResponse(res, 400, "فرمت داده نامعتبر است", "INVALID_DATA_FORMAT");
    } else if (err.code === 'ECONNREFUSED') {
        return sendErrorResponse(res, 503, "سرویس در دسترس نیست", "SERVICE_UNAVAILABLE");
    } else {
        return sendErrorResponse(res, 500, "خطای داخلی سرور", "INTERNAL_ERROR");
    }
});

// 📌 مدیریت مسیرهای نامعتبر (404 Not Found)
app.use((req, res) => {
    sendErrorResponse(res, 404, "مسیر درخواستی یافت نشد", "ROUTE_NOT_FOUND");
});
```

### Unhandled Promise Rejections

```javascript
// server.js
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    
    // در production، سرور را gracefully shutdown کن
    if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Shutting down server due to unhandled promise rejection');
        process.exit(1);
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    
    // در production، سرور را فوراً shutdown کن
    if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Shutting down server due to uncaught exception');
        process.exit(1);
    }
});
```

## Rate Limiting و Security Errors

### Rate Limiting

```javascript
// routes/authRoutes.js
const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 دقیقه
  max: 20, // حداکثر 20 درخواست
  message: {
    status: 429,
    error: "تلاش برای ثبت نام بسیار زیاد است، لطفاً بعداً دوباره امتحان کنید.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### CORS Errors

```javascript
// server.js
app.use(cors({ 
  origin: "https://finoo.ir", 
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Custom CORS error handler
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin !== "https://finoo.ir") {
    return sendErrorResponse(res, 403, "دسترسی از این دامنه مجاز نیست", "CORS_ERROR");
  }
  next();
});
```

## Logging Strategy

### Development Logging

```javascript
// utils/logger.js
const isDevelopment = process.env.NODE_ENV === 'development';

function logError(error, context = '') {
  if (isDevelopment) {
    console.error(`❌ ${context}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } else {
    // در production فقط پیام اصلی را log کن
    console.error(`❌ ${context}: ${error.message}`);
  }
}

function logInfo(message, data = null) {
  if (isDevelopment) {
    console.log(`ℹ️ ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

function logWarning(message, data = null) {
  console.warn(`⚠️ ${message}`, data || '');
}

module.exports = { logError, logInfo, logWarning };
```

## Error Codes Reference

### Authentication Errors (AUTH_*)
- `AUTH_MISSING_TOKEN` - Token ارسال نشده
- `AUTH_INVALID_TOKEN` - Token نامعتبر
- `AUTH_TOKEN_EXPIRED` - Token منقضی شده
- `AUTH_USER_NOT_FOUND` - کاربر یافت نشد
- `AUTH_INVALID_CREDENTIALS` - اطلاعات ورود اشتباه

### Validation Errors (VALIDATION_*)
- `VALIDATION_MISSING_FIELD` - فیلد الزامی ارسال نشده
- `VALIDATION_INVALID_FORMAT` - فرمت داده اشتباه
- `VALIDATION_OUT_OF_RANGE` - مقدار خارج از محدوده
- `VALIDATION_DUPLICATE_VALUE` - مقدار تکراری

### Database Errors (DB_*)
- `DB_CONNECTION_FAILED` - خطا در اتصال دیتابیس
- `DB_QUERY_FAILED` - خطا در اجرای query
- `DB_CONSTRAINT_VIOLATION` - نقض محدودیت دیتابیس
- `DB_RECORD_NOT_FOUND` - رکورد یافت نشد

### External Service Errors (EXT_*)
- `EXT_SMS_FAILED` - خطا در ارسال SMS
- `EXT_EMAIL_FAILED` - خطا در ارسال ایمیل
- `EXT_API_TIMEOUT` - timeout در API خارجی
- `EXT_SERVICE_UNAVAILABLE` - سرویس خارجی در دسترس نیست

### File Upload Errors (FILE_*)
- `FILE_TOO_LARGE` - حجم فایل زیاد
- `FILE_INVALID_TYPE` - نوع فایل نامعتبر
- `FILE_UPLOAD_FAILED` - خطا در آپلود

## بهترین روش‌ها

### 1. Error Handling در Async Functions

```javascript
// ✅ درست: استفاده از try-catch
async function processUserData(userData) {
  try {
    const validatedData = await validateUserData(userData);
    const savedUser = await saveUser(validatedData);
    return savedUser;
  } catch (error) {
    logError(error, 'processUserData');
    throw error; // Re-throw برای handling در سطح بالاتر
  }
}

// ❌ غلط: عدم مدیریت خطا
async function processUserData(userData) {
  const validatedData = await validateUserData(userData);
  const savedUser = await saveUser(validatedData);
  return savedUser;
}
```

### 2. Error Propagation

```javascript
// ✅ درست: انتقال مناسب خطا
async function getUserProfile(userId) {
  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.toProfileJSON();
  } catch (error) {
    // Log کردن و re-throw
    logError(error, `getUserProfile(${userId})`);
    throw error;
  }
}

// در Controller
try {
  const profile = await getUserProfile(req.user.id);
  return sendSuccessResponse(res, profile);
} catch (error) {
  if (error.message === 'User not found') {
    return sendErrorResponse(res, 404, 'پروفایل کاربر یافت نشد');
  }
  return sendErrorResponse(res, 500, 'خطا در دریافت پروفایل');
}
```

### 3. Input Sanitization

```javascript
// utils/sanitizer.js
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // حذف HTML tags
    .substring(0, 1000); // محدود کردن طول
}

function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value;
  }
  return sanitized;
}
```

### 4. Graceful Shutdown

```javascript
// server.js
let server;

function gracefulShutdown(signal) {
  console.log(`🔄 Received ${signal}. Shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed.');
      
      // بستن اتصالات دیتابیس
      if (db && db.end) {
        db.end(() => {
          console.log('✅ Database connections closed.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server = app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
```