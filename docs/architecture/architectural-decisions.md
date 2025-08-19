# تصمیمات معماری (Architectural Decision Records)

## ADR-001: انتخاب معماری MVC چندلایه

### وضعیت
پذیرفته شده

### زمینه
نیاز به ساختار منظم و قابل نگهداری برای API مالی که بتواند:
- داده‌های مالی را مدیریت کند
- احراز هویت کاربران را انجام دهد
- با سرویس‌های خارجی ارتباط برقرار کند
- قابلیت توسعه داشته باشد

### تصمیم
استفاده از معماری MVC چندلایه با لایه‌های جداگانه برای:
- Routes (مسیریابی)
- Middleware (میان‌افزار)
- Controllers (کنترلرها)
- Services (سرویس‌ها)
- Models (مدل‌ها)
- Database (دیتابیس)

### دلایل
- **Separation of Concerns**: هر لایه مسئولیت مشخصی دارد
- **Testability**: امکان تست مستقل هر لایه
- **Maintainability**: نگهداری و توسعه آسان‌تر
- **Reusability**: استفاده مجدد از کامپوننت‌ها
- **Team Collaboration**: امکان کار موازی تیم

### پیامدها
- **مثبت**: کد منظم، قابل تست، قابل توسعه
- **منفی**: پیچیدگی اولیه بیشتر، فایل‌های بیشتر

---

## ADR-002: انتخاب JWT برای احراز هویت

### وضعیت
پذیرفته شده

### زمینه
نیاز به سیستم احراز هویت که:
- Stateless باشد
- قابل مقیاس‌پذیری داشته باشد
- امن باشد
- با mobile apps سازگار باشد

### تصمیم
استفاده از JWT (JSON Web Tokens) با:
- Access Token (30 روز)
- Refresh Token (60 روز)
- HS256 algorithm

### دلایل
- **Stateless**: سرور نیازی به ذخیره session ندارد
- **Scalability**: قابل مقیاس‌پذیری بالا
- **Cross-platform**: سازگار با web و mobile
- **Self-contained**: تمام اطلاعات در token موجود است
- **Industry Standard**: استاندارد صنعتی

### پیامدها
- **مثبت**: عملکرد بالا، مقیاس‌پذیری، سادگی
- **منفی**: اندازه token بزرگ‌تر، مدیریت revocation پیچیده‌تر

---

## ADR-003: انتخاب MySQL برای دیتابیس

### وضعیت
پذیرفته شده

### زمینه
نیاز به دیتابیس که:
- روابط پیچیده را پشتیبانی کند
- ACID compliance داشته باشد
- عملکرد بالا برای read operations داشته باشد
- پشتیبانی خوب از ecosystem داشته باشد

### تصمیم
استفاده از MySQL با:
- Connection pooling
- Promise-based queries (mysql2)
- Proper indexing strategy

### دلایل
- **ACID Compliance**: تضمین consistency داده‌ها
- **Performance**: عملکرد عالی برای read-heavy workloads
- **Ecosystem**: پشتیبانی عالی در Node.js
- **Reliability**: پایداری و قابلیت اطمینان بالا
- **Cost-effective**: هزینه مناسب

### پیامدها
- **مثبت**: عملکرد بالا، قابلیت اطمینان، پشتیبانی خوب
- **منفی**: نیاز به schema design دقیق، scaling challenges

---

## ADR-004: استفاده از Connection Pooling

### وضعیت
پذیرفته شده

### زمینه
نیاز به مدیریت بهینه اتصالات دیتابیس برای:
- کاهش overhead اتصال
- بهبود performance
- مدیریت منابع

### تصمیم
استفاده از MySQL connection pool با تنظیمات:
- connectionLimit: 10
- queueLimit: 0
- waitForConnections: true

### دلایل
- **Performance**: کاهش زمان برقراری اتصال
- **Resource Management**: استفاده بهینه از منابع
- **Scalability**: پشتیبانی از concurrent requests
- **Reliability**: مدیریت خودکار اتصالات

### پیامدها
- **مثبت**: عملکرد بهتر، مدیریت منابع بهینه
- **منفی**: پیچیدگی اضافی در configuration

---

## ADR-005: انتخاب Express.js برای Web Framework

### وضعیت
پذیرفته شده

### زمینه
نیاز به web framework که:
- سبک و سریع باشد
- middleware ecosystem غنی داشته باشد
- community support خوب داشته باشد
- flexible باشد

### تصمیم
استفاده از Express.js با middleware های:
- CORS
- Rate limiting
- File upload (Multer)
- JSON parsing

### دلایل
- **Performance**: سبک و سریع
- **Ecosystem**: middleware های متنوع
- **Flexibility**: قابلیت customization بالا
- **Community**: پشتیبانی community عالی
- **Documentation**: مستندات کامل

### پیامدها
- **مثبت**: توسعه سریع، انعطاف‌پذیری، عملکرد خوب
- **منفی**: نیاز به configuration دستی بیشتر

---

## ADR-006: استفاده از Service Layer Pattern

### وضعیت
پذیرفته شده

### زمینه
نیاز به جداسازی business logic از:
- Controllers
- Database access
- External API calls

### تصمیم
ایجاد Service Layer جداگانه که شامل:
- Database operations
- Business logic
- External service integrations

### دلایل
- **Separation of Concerns**: جداسازی منطق تجاری
- **Reusability**: استفاده مجدد در controllers مختلف
- **Testability**: تست آسان‌تر business logic
- **Maintainability**: نگهداری آسان‌تر کد

### پیامدها
- **مثبت**: کد تمیزتر، قابل تست، قابل استفاده مجدد
- **منفی**: لایه اضافی، پیچیدگی بیشتر

---

## ADR-007: انتخاب OTP برای احراز هویت موبایل

### وضعیت
پذیرفته شده

### زمینه
نیاز به روش احراز هویت که:
- برای کاربران ایرانی مناسب باشد
- امن باشد
- user experience خوب داشته باشد

### تصمیم
پیاده‌سازی OTP (One-Time Password) با:
- SMS delivery
- 5-minute expiration
- Rate limiting
- Automatic user creation

### دلایل
- **User Experience**: راحتی استفاده برای کاربران
- **Security**: امنیت مناسب
- **Localization**: مناسب برای بازار ایران
- **Mobile-first**: طراحی برای موبایل

### پیامدها
- **مثبت**: UX بهتر، adoption بیشتر، امنیت مناسب
- **منفی**: وابستگی به SMS service، هزینه SMS

---

## ADR-008: استفاده از Scheduled Jobs برای Data Fetching

### وضعیت
پذیرفته شده

### زمینه
نیاز به دریافت منظم داده‌های قیمت از:
- TGJU API
- در ساعات کاری بازار
- با قابلیت retry

### تصمیم
استفاده از node-schedule برای:
- Hourly execution (8 AM - 11 PM Tehran time)
- Multiple backup URLs
- Retry logic with exponential backoff

### دلایل
- **Reliability**: چندین URL backup
- **Performance**: دریافت داده در زمان مناسب
- **Efficiency**: فقط در ساعات کاری
- **Fault Tolerance**: retry mechanism

### پیامدها
- **مثبت**: داده‌های به‌روز، قابلیت اطمینان بالا
- **منفی**: پیچیدگی اضافی، وابستگی به external API

---

## ADR-009: انتخاب Pagination Strategy

### وضعیت
پذیرفته شده

### زمینه
نیاز به مدیریت داده‌های حجیم برای:
- بهبود performance
- کاهش memory usage
- بهتر کردن user experience

### تصمیم
پیاده‌سازی offset-based pagination با:
- Default limit: 10
- Maximum limit: 100
- Metadata در response

### دلایل
- **Performance**: کاهش load دیتابیس
- **Memory Efficiency**: استفاده بهینه از memory
- **User Experience**: loading سریع‌تر
- **Scalability**: قابل مقیاس‌پذیری

### پیامدها
- **مثبت**: عملکرد بهتر، UX بهتر
- **منفی**: پیچیدگی اضافی در client-side

---

## ADR-010: Error Handling Strategy

### وضعیت
پذیرفته شده

### زمینه
نیاز به مدیریت یکپارچه خطاها برای:
- User experience بهتر
- Debugging آسان‌تر
- Security

### تصمیم
پیاده‌سازی centralized error handling با:
- Structured error responses
- Appropriate HTTP status codes
- Error logging
- User-friendly messages در فارسی

### دلایل
- **Consistency**: پاسخ‌های یکپارچه
- **Security**: عدم افشای اطلاعات حساس
- **Debugging**: logging مناسب برای توسعه‌دهندگان
- **Localization**: پیام‌های فارسی برای کاربران

### پیامدها
- **مثبت**: UX بهتر، debugging آسان‌تر، امنیت بیشتر
- **منفی**: کد اضافی برای error handling