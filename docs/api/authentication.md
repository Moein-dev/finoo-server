# API مستندات احراز هویت

## نمای کلی

API احراز هویت Finoo شامل دو روش اصلی است:
1. **احراز هویت با نام کاربری** - برای کاربران موجود
2. **احراز هویت با OTP** - برای ورود سریع با شماره موبایل

تمام endpoint های احراز هویت در مسیر `/api/auth` قرار دارند.

## Base URL
```
https://your-domain.com/api/auth
```

## Authentication Flow

### جریان احراز هویت با نام کاربری
```
1. ثبت نام (اختیاری) → 2. ورود → 3. دریافت Token → 4. استفاده از API
```

### جریان احراز هویت با OTP
```
1. درخواست کد → 2. تایید کد → 3. دریافت Token → 4. استفاده از API
```

---

## Endpoints

### 1. ثبت نام کاربر

**POST** `/register`

ثبت نام کاربر جدید در سیستم. اگر نام کاربری ارسال نشود، به صورت خودکار تولید می‌شود.

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "username": "my_username",  // اختیاری - اگر ارسال نشود خودکار تولید می‌شود
  "name": "نام کاربر"         // اختیاری
}
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "username": "my_username",
    "message": "کاربر با موفقیت احراز هویت شد. لطفا وارد شوید تا کد دسترسی به سرور رو دریافت کنید"
  }
}
```

#### Response Error (500)
```json
{
  "status": 500,
  "error": "خطای سرور"
}
```

#### Rate Limiting
- **محدودیت**: 20 درخواست در دقیقه
- **پیام خطا**: "تلاش برای ثبت نام بسیار زیاد است، لطفاً بعداً دوباره امتحان کنید."

#### مثال cURL
```bash
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "name": "جان دو"
  }'
```

---

### 2. ورود با نام کاربری

**POST** `/login`

ورود کاربر با نام کاربری و دریافت JWT tokens.

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "username": "my_username"  // الزامی
}
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "profile": {
      "username": "my_username",
      "email": null,
      "is_email_verified": false,
      "phone": null,
      "is_phone_verified": false,
      "name": "نام کاربر",
      "image": null
    },
    "authentication": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### Response Error (400)
```json
{
  "status": 400,
  "error": "نام کاربری مورد نیاز است"
}
```

#### Response Error (401)
```json
{
  "status": 401,
  "error": "نام کاربری صحیح نیست"
}
```

#### مثال cURL
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe"
  }'
```

---

### 3. درخواست کد OTP

**POST** `/send-code`

ارسال کد تایید به شماره موبایل کاربر. اگر کاربر وجود نداشته باشد، خودکار ایجاد می‌شود.

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "phone": "09123456789"  // الزامی - شماره موبایل
}
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "message": "کد تایید ارسال شد."
  }
}
```

#### Response Error (400)
```json
{
  "status": 400,
  "error": "شماره تلفن الزامی است."
}
```

#### Response Error (500)
```json
{
  "status": 500,
  "error": "ارسال پیامک با خطا مواجه شد."
}
```

#### ویژگی‌های خاص
- **مدت اعتبار کد**: 5 دقیقه
- **طول کد**: 5 رقم
- **ایجاد کاربر خودکار**: اگر شماره موبایل وجود نداشته باشد، کاربر جدید ایجاد می‌شود
- **SMS Provider**: Trez.ir

#### مثال cURL
```bash
curl -X POST https://your-domain.com/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789"
  }'
```

---

### 4. تایید کد OTP و ورود

**POST** `/verify-code`

تایید کد OTP و دریافت JWT tokens.

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "phone": "09123456789",  // الزامی
  "code": "12345"          // الزامی - کد 5 رقمی دریافتی
}
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "profile": {
      "username": "user_123456",
      "email": null,
      "is_email_verified": false,
      "phone": "09123456789",
      "is_phone_verified": true,
      "name": null,
      "image": null
    },
    "authentication": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### Response Error (400)
```json
{
  "status": 400,
  "error": "شماره و کد الزامی هستند."
}
```

#### Response Error (400) - کد اشتباه
```json
{
  "status": 400,
  "error": "کد اشتباه است یا منقضی شده."
}
```

#### Response Error (400) - کد منقضی
```json
{
  "status": 400,
  "error": "کد منقضی شده است."
}
```

#### مثال cURL
```bash
curl -X POST https://your-domain.com/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "09123456789",
    "code": "12345"
  }'
```

---

### 5. تمدید Token

**POST** `/refresh`

تمدید access token با استفاده از refresh token.

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // الزامی
}
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Response Error (400)
```json
{
  "status": 400,
  "error": "کد بازیابی نیاز است"
}
```

#### Response Error (403)
```json
{
  "status": 403,
  "error": "کد بازیابی درست نیست"
}
```

#### Response Error (403) - Token منقضی
```json
{
  "status": 403,
  "error": "کد بازیابی نامعتبر یا منقضی شده است"
}
```

#### مثال cURL
```bash
curl -X POST https://your-domain.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

### 6. خروج از حساب

**POST** `/logout`

خروج کاربر از حساب و باطل کردن refresh token.

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // الزامی
}
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "message": "کاربر با موفقیت از حساب خارج شد"
  }
}
```

#### Response Error (400)
```json
{
  "status": 400,
  "error": "کد بازیابی مورد نیاز است"
}
```

#### Response Error (500)
```json
{
  "status": 500,
  "error": "خطای سرور"
}
```

#### مثال cURL
```bash
curl -X POST https://your-domain.com/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## JWT Token Structure

### Access Token
- **مدت اعتبار**: 30 روز
- **Algorithm**: HS256
- **Payload**:
```json
{
  "id": 123,
  "username": "user_123456",
  "role": "user",
  "iat": 1640995200,
  "exp": 1643587200
}
```

### Refresh Token
- **مدت اعتبار**: 60 روز
- **Algorithm**: HS256
- **Payload**:
```json
{
  "id": 123,
  "username": "user_123456",
  "iat": 1640995200,
  "exp": 1646179200
}
```

## استفاده از Token در درخواست‌ها

برای دسترسی به endpoint های محافظت شده، باید access token را در header ارسال کنید:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### مثال
```bash
curl -X GET https://your-domain.com/api/prices \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## خطاهای احراز هویت

### 401 Unauthorized
```json
{
  "status": 401,
  "error": "کد دسترسی مورد نیاز است"
}
```

### 403 Forbidden
```json
{
  "status": 403,
  "error": "کد دسترسی نامعتبر یا منقضی شده است"
}
```

## نکات امنیتی

1. **Token Storage**: Token ها را به صورت امن ذخیره کنید (HttpOnly cookies یا secure storage)
2. **HTTPS**: همیشه از HTTPS استفاده کنید
3. **Token Expiry**: Access token ها مدت اعتبار کوتاه دارند، از refresh token برای تمدید استفاده کنید
4. **Rate Limiting**: endpoint ثبت نام محدودیت درخواست دارد
5. **OTP Security**: کدهای OTP مدت اعتبار کوتاه (5 دقیقه) دارند

## مثال کامل جریان احراز هویت

### جریان OTP (توصیه شده)

```javascript
// 1. درخواست کد OTP
const sendCodeResponse = await fetch('/api/auth/send-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '09123456789' })
});

// 2. تایید کد و دریافت tokens
const verifyResponse = await fetch('/api/auth/verify-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    phone: '09123456789', 
    code: '12345' 
  })
});

const { data } = await verifyResponse.json();
const { access_token, refresh_token } = data.authentication;

// 3. استفاده از access token
const apiResponse = await fetch('/api/prices', {
  headers: { 
    'Authorization': `Bearer ${access_token}` 
  }
});

// 4. تمدید token در صورت نیاز
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: refresh_token })
});
```