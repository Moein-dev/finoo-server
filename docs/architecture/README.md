# معماری سیستم Finoo Backend

## نمای کلی سیستم

Finoo Backend یک API مالی است که بر اساس معماری **MVC چندلایه** طراحی شده و قیمت‌های لحظه‌ای و تاریخی ارزها، رمزارزها و فلزات گرانبها را ارائه می‌دهد.

## معماری کلی سیستم

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│              (Web App, Mobile App, etc.)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│                   (Express Server)                          │
│                  - CORS Configuration                       │
│                  - Rate Limiting                           │
│                  - Static File Serving                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Routes Layer                             │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Auth Routes   │    │        Data Routes              │ │
│  │   /api/auth/*   │    │         /api/*                  │ │
│  │                 │    │                                 │ │
│  │ • /register     │    │ • /prices                       │ │
│  │ • /login        │    │ • /search                       │ │
│  │ • /send-code    │    │ • /prices/range                 │ │
│  │ • /verify-code  │    │ • /symbols                      │ │
│  │ • /refresh      │    │ • /categories                   │ │
│  │ • /logout       │    │                                 │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Authentication  │  │  Rate Limiting  │  │File Upload  │ │
│  │   Middleware    │  │   Middleware    │  │ Middleware  │ │
│  │                 │  │                 │  │             │ │
│  │ • JWT Verify    │  │ • Brute Force   │  │ • Multer    │ │
│  │ • Token Valid   │  │   Protection    │  │ • Image     │ │
│  │ • User Context  │  │ • Request Limit │  │   Validation│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controller Layer                          │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ Auth Controller │    │      Profile Controller         │ │
│  │                 │    │                                 │ │
│  │ • register()    │    │ • updateProfile()               │ │
│  │ • login()       │    │ • verifyEmail()                 │ │
│  │ • requestOtp()  │    │ • sendPhoneCode()               │ │
│  │ • loginWithOtp()│    │ • verifyPhone()                 │ │
│  │ • refreshToken()│    │ • getProfile()                  │ │
│  │ • logout()      │    │                                 │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Database Service                           │ │
│  │                                                         │ │
│  │ • getDataByDate()      • createUser()                  │ │
│  │ • getDataInRange()     • getUserByUsername()           │ │
│  │ • insertPrice()        • updateUserRefreshToken()      │ │
│  │ • searchPrices()       • createPhoneVerification()     │ │
│  │ • getSymbols()         • getPhoneVerification()        │ │
│  │ • getCategories()      • getUserByPhone()              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Model Layer                             │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ User Model  │ │Price Model  │ │Currency     │ │Category│ │
│  │             │ │             │ │Model        │ │Model   │ │
│  │• fromDB()   │ │• fromDB()   │ │             │ │        │ │
│  │• toJSON()   │ │• toJSON()   │ │• constructor│ │• constr│ │
│  │• toProfile()│ │• constructor│ │             │ │        │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   MySQL Database                        │ │
│  │                                                         │ │
│  │ Tables:                                                 │ │
│  │ • users                 • currencies                    │ │
│  │ • new_prices           • categories                     │ │
│  │ • phone_verifications                                   │ │
│  │                                                         │ │
│  │ Connection Pool: mysql2 with Promise support           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## جریان داده در سیستم

### 1. جریان درخواست API
```
Client Request → Routes → Middleware → Controller → Service → Database
                    ↓
Client Response ← Response Handler ← Controller ← Service ← Database
```

### 2. جریان احراز هویت
```
Login Request → Auth Route → Auth Controller → Database Service
                    ↓
JWT Tokens ← Response Handler ← Auth Controller ← User Validation
```

### 3. جریان دریافت داده
```
Price Request → Data Route → Auth Middleware → Database Service
                    ↓
Price Data ← Response Handler ← Pagination Logic ← Database Query
```

## اجزای اصلی سیستم

### 1. **Server Configuration** (`server.js`)
- نقطه ورود اصلی برنامه
- پیکربندی Express server
- تنظیمات CORS برای دامنه finoo.ir
- مدیریت خطاهای عمومی
- سرو فایل‌های استاتیک (آیکن‌ها)

### 2. **Database Layer** (`config/db.js`)
- مدیریت اتصال MySQL
- Connection Pool با mysql2
- بررسی سلامت اتصال
- مدیریت متغیرهای محیطی

### 3. **Service Layer** (`services/databaseService.js`)
- لایه انتزاع دسترسی به داده
- عملیات CRUD برای تمام entities
- منطق pagination و filtering
- مدیریت روابط بین جداول

### 4. **Model Layer**
- **UserModel**: مدل کاربر با متدهای تبدیل
- **PriceModel**: مدل قیمت با روابط ارز
- **CurrencyModel**: مدل ارز با دسته‌بندی
- **CategoryModel**: مدل دسته‌بندی ارزها

### 5. **Controller Layer**
- **AuthController**: مدیریت احراز هویت
- **ProfileController**: مدیریت پروفایل کاربر
- هماهنگی منطق تجاری
- مدیریت request/response

### 6. **Route Layer**
- **AuthRoutes**: مسیرهای احراز هویت
- **DataRoutes**: مسیرهای دریافت داده
- تعریف endpoints و HTTP methods
- اتصال به controllers

### 7. **Middleware Layer**
- **AuthMiddleware**: اعتبارسنجی JWT
- **Rate Limiting**: محدودیت درخواست
- **File Upload**: آپلود تصاویر پروفایل
- **Error Handling**: مدیریت خطاها

## ویژگی‌های معماری

### 1. **Separation of Concerns**
- هر لایه مسئولیت مشخصی دارد
- جداسازی منطق تجاری از دسترسی داده
- جداسازی routing از business logic

### 2. **Scalability**
- Connection pooling برای دیتابیس
- Stateless authentication با JWT
- Pagination برای داده‌های حجیم

### 3. **Security**
- JWT-based authentication
- Rate limiting برای جلوگیری از abuse
- Input validation و sanitization
- CORS configuration

### 4. **Error Handling**
- Centralized error handling
- Structured error responses
- Logging برای debugging

### 5. **External Integrations**
- TGJU API برای دریافت قیمت‌ها
- SMS service برای OTP
- Email service برای تایید ایمیل

## الگوهای طراحی استفاده شده

### 1. **MVC Pattern**
- Model: Data models و database operations
- View: JSON responses (API responses)
- Controller: Business logic coordination

### 2. **Service Layer Pattern**
- جداسازی business logic از data access
- Reusable service functions
- Centralized database operations

### 3. **Middleware Pattern**
- Cross-cutting concerns
- Request/response processing
- Authentication و authorization

### 4. **Repository Pattern** (در Service Layer)
- Data access abstraction
- Database query encapsulation
- Testability improvement

## مزایای این معماری

1. **Maintainability**: کد قابل نگهداری و توسعه
2. **Testability**: امکان تست آسان هر لایه
3. **Reusability**: استفاده مجدد از components
4. **Scalability**: قابلیت مقیاس‌پذیری
5. **Security**: امنیت در تمام لایه‌ها
6. **Performance**: بهینه‌سازی در دسترسی داده