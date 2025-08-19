# مستندات مدل‌های داده و Service Layer

## نمای کلی

این سند شامل مستندات کامل مدل‌های داده، الگوهای Service Layer و نحوه تعامل آن‌ها با دیتابیس است. سیستم از الگوی Repository Pattern در Service Layer استفاده می‌کند.

## معماری Data Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│                (databaseService.js)                         │
│                                                             │
│  • Business Logic                                          │
│  • Data Validation                                         │
│  • Transaction Management                                  │
│  • Error Handling                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Model Layer                              │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ UserModel   │ │ PriceModel  │ │ CurrencyModel│ │Category│ │
│  │             │ │             │ │             │ │Model   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
│                   (MySQL with mysql2)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## مدل‌های داده (Data Models)

### 1. UserModel

مدل کاربر که اطلاعات کاربران را مدیریت می‌کند.

#### فایل: `models/userModel.js`

```javascript
class UserModel {
    constructor({
        id,
        username,
        email = null,
        email_verified_at = null,
        phone = null,
        is_phone_verified = false,
        name = null,
        image = null,
        role = 'user',
        refresh_token = null,
        created_at = null,
        updated_at = null
    }) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.email_verified_at = email_verified_at;
        this.phone = phone;
        this.is_phone_verified = is_phone_verified;
        this.name = name;
        this.image = image;
        this.role = role;
        this.refresh_token = refresh_token;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }
}
```

#### متدهای اصلی

##### `static fromDatabase(row)`
تبدیل داده‌های خام دیتابیس به نمونه UserModel.

```javascript
static fromDatabase(row) {
    return new UserModel({
        id: row.id,
        username: row.username,
        email: row.email,
        email_verified_at: row.email_verified_at,
        phone: row.phone,
        is_phone_verified: row.is_phone_verified === 1,
        name: row.name,
        image: row.image,
        role: row.role,
        refresh_token: row.refresh_token,
        created_at: row.created_at,
        updated_at: row.updated_at
    });
}
```

##### `toJSON()`
تبدیل مدل به JSON برای ارسال به کلاینت.

```javascript
toJSON() {
    return {
        id: this.id,
        username: this.username,
        email: this.email,
        is_email_verified: !!this.email_verified_at,
        phone: this.phone,
        is_phone_verified: this.is_phone_verified,
        name: this.name,
        image: this.image,
        role: this.role
    };
}
```

##### `toProfileJSON()`
تبدیل مدل به اطلاعات پروفایل (بدون اطلاعات حساس).

```javascript
toProfileJSON() {
    return {
        username: this.username,
        email: this.email,
        is_email_verified: !!this.email_verified_at,
        phone: this.phone,
        is_phone_verified: this.is_phone_verified,
        name: this.name,
        image: this.image
    };
}
```

#### ویژگی‌های خاص
- **Boolean Conversion**: تبدیل خودکار `is_phone_verified` از 0/1 به boolean
- **Sensitive Data Filtering**: حذف اطلاعات حساس در متدهای JSON
- **Null Handling**: مدیریت مقادیر null در فیلدهای اختیاری
---


### 2. PriceModel

مدل قیمت که اطلاعات قیمت‌های ارزها را مدیریت می‌کند.

#### فایل: `models/priceModel.js`

```javascript
class PriceModel {
    constructor(data) {
        this.id = data.id;
        this.currency = new CurrencyModel({
            name: data.name,
            symbol: data.symbol,
            icon: data.icon,
            color: data.color,
            category: data.category,
            priority: data.priority,
            unit: data.unit,
        });
        this.date = data.date;
        this.price = parseFloat(data.price);
        this.bubblePercent = data.bubblePercent !== null ? 
            parseFloat(data.bubblePercent) : null;
    }
}
```

#### متدهای اصلی

##### `static fromDatabase(row)`
تبدیل داده‌های خام دیتابیس به نمونه PriceModel.

```javascript
static fromDatabase(row) {
    return new PriceModel({
        id: row.id,
        name: row.name,
        symbol: row.symbol,
        icon: row.icon,
        color: row.color,
        category: row.category,
        priority: row.priority,
        unit: row.unit,
        date: row.date,
        price: row.price,
        bubblePercent: row.percent_bubble !== null ? 
            parseFloat(row.percent_bubble) : null,
    });
}
```

##### `toJSON()`
تبدیل مدل به JSON برای API response.

```javascript
toJSON() {
    return {
        id: this.id,
        currency: {
            name: this.currency.name,
            symbol: this.currency.symbol,
            icon: this.currency.icon,
            color: this.currency.color,
            category: this.currency.category,
            priority: this.currency.priority,
            unit: this.currency.unit,
        },
        date: this.date,
        price: this.price,
        bubblePercent: this.bubblePercent,
    };
}
```

#### ویژگی‌های خاص
- **Nested Currency Object**: شامل اطلاعات کامل ارز
- **Type Conversion**: تبدیل خودکار price و bubblePercent به float
- **Null Handling**: مدیریت مقادیر null در bubblePercent

---

### 3. CurrencyModel

مدل ارز که اطلاعات ارزها و دارایی‌ها را مدیریت می‌کند.

#### فایل: `models/currencyModel.js`

```javascript
class CurrencyModel {
    constructor({
        id,
        name,
        symbol,
        category,
        icon = null,
        server_key = null,
        unit,
        color = '#FFFFFF',
        priority = 100,
    }) {
        this.id = id;
        this.name = name;
        this.symbol = symbol;
        this.category = category; // CategoryModel object
        this.icon = icon;
        this.server_key = server_key ?? symbol;
        this.unit = unit;
        this.color = color;
        this.priority = priority;
    }
}
```

#### ویژگی‌های خاص
- **Category Relationship**: شامل نمونه CategoryModel
- **Default Values**: مقادیر پیش‌فرض برای color و priority
- **Server Key Fallback**: استفاده از symbol اگر server_key موجود نباشد

---

### 4. CategoryModel

مدل دسته‌بندی که انواع ارزها را طبقه‌بندی می‌کند.

#### فایل: `models/categoryModel.js`

```javascript
class CategoryModel {
    constructor({ id, name, type }) {
        this.id = id;
        this.name = name;
        this.type = type;
    }
}
```

#### ویژگی‌های خاص
- **Simple Structure**: ساختار ساده برای دسته‌بندی
- **Type Identifier**: شناسه یکتا برای هر نوع دسته‌بندی

---

## Service Layer (databaseService.js)

Service Layer شامل تمام منطق تجاری و عملیات دیتابیس است.

### الگوهای طراحی استفاده شده

#### 1. Repository Pattern
```javascript
// مثال: عملیات CRUD برای کاربران
async function createUser(username, name = null) {
    const [result] = await db.query(
        "INSERT INTO users (username, name) VALUES (?, ?)",
        [username, name]
    );
    return result;
}

async function getUserByUsername(username) {
    const [rows] = await db.query(
        `SELECT id, username, email, email_verified_at, phone, name, image, role 
         FROM users WHERE username = ?`,
        [username]
    );
    return rows[0] ? UserModel.fromDatabase(rows[0]) : null;
}
```

#### 2. Factory Pattern
```javascript
// تولید نمونه‌های مدل از داده‌های دیتابیس
function createPriceModelsFromRows(rows) {
    return rows.map((row) => {
        const category = row.cat_id ? 
            new CategoryModel({
                id: row.cat_id, 
                name: row.cat_name, 
                type: row.cat_type
            }) : null;
        return PriceModel.fromDatabase({...row, category});
    });
}
```

### دسته‌بندی توابع Service Layer

#### 1. توابع مدیریت کاربران

##### `createUser(username, name)`
ایجاد کاربر جدید.

```javascript
async function createUser(username, name = null) {
    const [result] = await db.query(
        "INSERT INTO users (username, name) VALUES (?, ?)",
        [username, name]
    );
    return result;
}
```

##### `createUserWithPhone(phone, name)`
ایجاد کاربر جدید با شماره موبایل.

```javascript
async function createUserWithPhone(phone, name = null) {
    // تولید نام کاربری تصادفی
    let username;
    let userExists;
    do {
        username = `user_${Math.floor(Math.random() * 1000000)}`;
        userExists = await getUserByUsername(username);
    } while (userExists);

    const [result] = await db.query(
        "INSERT INTO users (username, phone, name, is_phone_verified) VALUES (?, ?, ?, true)",
        [username, phone, name]
    );
    
    // بازگرداندن کاربر ایجاد شده
    const [userRows] = await db.query(
        "SELECT * FROM users WHERE id = ?",
        [result.insertId]
    );
    
    return userRows[0] ? UserModel.fromDatabase(userRows[0]) : null;
}
```

##### سایر توابع کاربر:
- `getUserByUsername(username)` - دریافت کاربر بر اساس نام کاربری
- `getUserById(userId)` - دریافت کاربر بر اساس شناسه
- `getUserByPhone(phone)` - دریافت کاربر بر اساس شماره موبایل
- `updateUserRefreshToken(userId, token)` - بروزرسانی refresh token
- `clearUserRefreshToken(refreshToken)` - پاک کردن refresh token#### 2. توا
بع مدیریت قیمت‌ها

##### `getDataByDate(date, lastPrice, limit, offset)`
دریافت قیمت‌ها بر اساس تاریخ با pagination.

```javascript
async function getDataByDate(date, lastPrice, limit, offset) {
    if (!date) {
        date = new Date().toISOString().split("T")[0];
    }
    
    const today = new Date().toISOString().split("T")[0];
    if (date > today) {
        throw new Error("Date cannot be in the future.");
    }
    
    const categoryJoin = "LEFT JOIN categories cat ON c.category_id = cat.id";
    
    if (lastPrice) {
        // دریافت آخرین قیمت هر ارز
        const query = `
            SELECT np.id, np.price, np.created_at AS date, np.percent_bubble,
                   c.id AS currency_id, c.name, c.category_id, c.icon, 
                   c.server_key, c.unit, c.priority, c.symbol, c.color,
                   cat.id as cat_id, cat.name as cat_name, cat.type as cat_type
            FROM new_prices np
            INNER JOIN (
                SELECT currency_id, MAX(created_at) AS max_date
                FROM new_prices
                WHERE DATE(created_at) = ?
                GROUP BY currency_id
            ) latest ON np.currency_id = latest.currency_id 
                AND np.created_at = latest.max_date
            INNER JOIN currencies c ON np.currency_id = c.id
            ${categoryJoin}
            ORDER BY c.priority ASC
        `;
        
        const [rows] = await db.query(query, [date]);
        
        // Fallback به آخرین قیمت‌ها اگر داده‌ای برای امروز وجود نداشت
        if (rows.length === 0 && date === today) {
            const fallbackRows = await getLatestPricesForAllCurrencies();
            return {
                data: fallbackRows.map((row) => PriceModel.fromDatabase(row)),
                totalRecords: fallbackRows.length,
                requestedDate: null,
            };
        }
        
        return {
            data: rows.map((row) => {
                const category = row.cat_id ? 
                    new CategoryModel({
                        id: row.cat_id, 
                        name: row.cat_name, 
                        type: row.cat_type
                    }) : null;
                return PriceModel.fromDatabase({...row, category});
            }),
            totalRecords: rows.length,
            requestedDate: date,
        };
    }
    
    // پیاده‌سازی pagination معمولی...
}
```

##### `insertPrice(name, serverKey, price, date, bubblePercent)`
درج قیمت جدید.

```javascript
async function insertPrice(name, serverKey, price, date, bubblePercent = null) {
    try {
        const currencyId = await findCurrencyId(serverKey);
        
        if (!currencyId) {
            console.error(`❌ Cannot insert price for ${name} (${serverKey}): currency not found`);
            return;
        }
        
        const uuid = require('uuid').v4();
        
        const insertQuery = `
            INSERT INTO new_prices (id, currency_id, price, created_at, percent_bubble)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await db.query(insertQuery, [uuid, currencyId, price, date || new Date(), bubblePercent]);
        console.log(`✅ Inserted price for ${name} (${serverKey}) with currency_id: ${currencyId}`);
    } catch (error) {
        console.error(`❌ Error inserting price for ${name}:`, error);
    }
}
```

##### سایر توابع قیمت:
- `getDataInRange(startDate, endDate, limit, offset)` - دریافت قیمت‌ها در بازه زمانی
- `searchPrices(symbol, category, page, limit)` - جستجو و فیلتر قیمت‌ها
- `getPriceBySymbolAndDate(symbol, date)` - قیمت تک ارز در تاریخ مشخص

#### 3. توابع مدیریت تایید شماره موبایل

##### `createPhoneVerification(userId, phone, code, expiresAt)`
ایجاد رکورد تایید شماره موبایل.

##### `getPhoneVerification(userId, phone)`
دریافت آخرین کد تایید.

##### `verifyPhoneCode(userId, phone, code)`
تایید کد ارسال شده.

#### 4. توابع کمکی

##### `getSymbols()`
دریافت لیست تمام نمادهای موجود.

##### `getCategories()`
دریافت لیست دسته‌بندی‌ها.

##### `getAllCurrencies()`
دریافت تمام ارزهای موجود.

##### `hasDataForDate(date)`
بررسی وجود داده برای تاریخ مشخص.

### الگوهای Error Handling

#### 1. Database Connection Errors
```javascript
async function pingDatabase() {
    try {
        const [rows] = await db.query("SELECT 1");
        console.log("✅ Database connection is active.");
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1);
    }
}
```

#### 2. Query Execution Errors
```javascript
async function safeQuery(query, params) {
    try {
        const [rows] = await db.query(query, params);
        return rows;
    } catch (error) {
        console.error("❌ Database query error:", error);
        throw new Error("Database operation failed");
    }
}
```

#### 3. Data Validation Errors
```javascript
function validateDateRange(startDate, endDate) {
    if (startDate > endDate) {
        throw new Error(
            "Invalid date range. The start date cannot be after the end date."
        );
    }
}
```

### الگوهای Transaction Management

#### 1. Simple Transaction
```javascript
async function createUserWithVerification(userData, verificationData) {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // ایجاد کاربر
        const [userResult] = await connection.query(
            "INSERT INTO users (username, phone) VALUES (?, ?)",
            [userData.username, userData.phone]
        );
        
        // ایجاد رکورد تایید
        await connection.query(
            "INSERT INTO phone_verifications (user_id, phone, code, expires_at) VALUES (?, ?, ?, ?)",
            [userResult.insertId, verificationData.phone, verificationData.code, verificationData.expiresAt]
        );
        
        await connection.commit();
        return userResult.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
```

## بهترین روش‌ها (Best Practices)

### 1. Model Design
- استفاده از static factory methods برای تبدیل داده‌ها
- جداسازی منطق presentation از business logic
- مدیریت صحیح null values
- Type conversion در constructor

### 2. Service Layer Design
- یک مسئولیت برای هر تابع
- استفاده از async/await
- Error handling مناسب
- Logging برای debugging

### 3. Database Operations
- استفاده از parameterized queries
- Connection pooling
- Transaction management
- Index optimization

### 4. Performance Optimization
- Lazy loading برای روابط
- Pagination برای داده‌های حجیم
- Caching برای داده‌های کم‌تغییر
- Batch operations برای عملیات حجیم

### 5. Security
- Input validation
- SQL injection prevention
- Sensitive data filtering
- Access control