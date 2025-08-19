# API مستندات داده‌ها

## نمای کلی

API داده‌های Finoo امکان دسترسی به قیمت‌های لحظه‌ای و تاریخی ارزها، رمزارزها و فلزات گرانبها را فراهم می‌کند. تمام endpoint های داده در مسیر `/api` قرار دارند و نیاز به احراز هویت دارند.

## Base URL
```
https://your-domain.com/api
```

## احراز هویت

تمام endpoint های داده نیاز به JWT token دارند:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Endpoints

### 1. دریافت قیمت‌ها

**GET** `/prices`

دریافت قیمت‌های ارزها با قابلیت pagination و فیلتر بر اساس تاریخ.

#### Headers
```http
Authorization: Bearer <access_token>
```

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date` | string | No | امروز | تاریخ مورد نظر (YYYY-MM-DD) |
| `page` | integer | No | 1 | شماره صفحه |
| `limit` | integer | No | 10 | تعداد آیتم در هر صفحه (حداکثر 100) |
| `last_price` | boolean | No | false | نمایش آخرین قیمت هر ارز |

#### Response Success (200)
```json
{
  "status": 200,
  "data": [
    {
      "id": "uuid-string",
      "currency": {
        "name": "دلار آمریکا",
        "symbol": "USD",
        "icon": "usd.png",
        "color": "#22c55e",
        "category": {
          "id": 1,
          "name": "ارز",
          "type": "currency"
        },
        "priority": 1,
        "unit": "IRR"
      },
      "date": "2024-01-15T10:30:00.000Z",
      "price": 42500.0,
      "bubblePercent": 2.5
    }
  ],
  "links": {
    "self": "https://your-domain.com/api/prices?date=2024-01-15&last_price=false&page=1&limit=10"
  },
  "meta": {
    "totalRecords": 25,
    "totalPages": 3,
    "currentPage": 1,
    "limitPerPage": 10,
    "requestedDate": "2024-01-15",
    "lastPriceMode": false
  }
}
```

#### Response Error (404)
```json
{
  "status": 404,
  "error": "هیچ داده ای برای تاریخ داده شده یافت نشد"
}
```

#### Response Error (400) - تاریخ آینده
```json
{
  "status": 400,
  "error": "تاریخ نامعتبر است. شما نمی توانید داده های آینده را درخواست کنید."
}
```

#### مثال cURL
```bash
curl -X GET "https://your-domain.com/api/prices?date=2024-01-15&page=1&limit=10&last_price=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```
---


### 2. جستجو در قیمت‌ها

**GET** `/search`

جستجو و فیلتر قیمت‌ها بر اساس نماد ارز یا دسته‌بندی.

#### Headers
```http
Authorization: Bearer <access_token>
```

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | No | - | نماد ارز (مثل USD, BTC) |
| `category` | string | No | - | نوع دسته‌بندی (مثل currency, crypto) |
| `page` | integer | No | 1 | شماره صفحه |
| `limit` | integer | No | 10 | تعداد آیتم در هر صفحه |

#### Response Success (200)
```json
{
  "status": 200,
  "data": [
    {
      "id": "uuid-string",
      "currency": {
        "name": "بیت کوین",
        "symbol": "BTC",
        "icon": "btc.png",
        "color": "#f59e0b",
        "category": {
          "id": 2,
          "name": "رمزارز",
          "type": "crypto"
        },
        "priority": 5,
        "unit": "USD"
      },
      "date": "2024-01-15T10:30:00.000Z",
      "price": 43250.75,
      "bubblePercent": null
    }
  ],
  "links": {
    "self": "https://your-domain.com/api/search?symbol=BTC&category=crypto&page=1&limit=10"
  },
  "meta": {
    "totalRecords": 15,
    "totalPages": 2,
    "currentPage": 1,
    "limitPerPage": 10
  }
}
```

#### Response Error (404)
```json
{
  "status": 404,
  "error": "هیچ داده ای برای فیلترهای داده شده یافت نشد"
}
```

#### مثال cURL
```bash
curl -X GET "https://your-domain.com/api/search?symbol=USD&page=1&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. قیمت‌ها در بازه زمانی

**GET** `/prices/range`

دریافت قیمت‌ها در بازه زمانی مشخص با محاسبه میانگین قیمت‌ها.

#### Headers
```http
Authorization: Bearer <access_token>
```

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | string | Yes | - | تاریخ شروع (YYYY-MM-DD) |
| `end_date` | string | Yes | - | تاریخ پایان (YYYY-MM-DD) |
| `page` | integer | No | 1 | شماره صفحه |
| `limit` | integer | No | 10 | تعداد آیتم در هر صفحه |

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "data": [
      {
        "id": "uuid-string",
        "currency": {
          "name": "یورو",
          "symbol": "EUR",
          "icon": "eur.png",
          "color": "#3b82f6",
          "category": {
            "id": 1,
            "name": "ارز",
            "type": "currency"
          },
          "priority": 2,
          "unit": "IRR"
        },
        "date": "2024-01-10T09:00:00.000Z",
        "price": 46200.0,
        "bubblePercent": 1.8
      }
    ],
    "avgPrices": [
      {
        "symbol": "USD",
        "category_id": 1,
        "unit": "IRR",
        "avg_price": 42750.25
      },
      {
        "symbol": "EUR",
        "category_id": 1,
        "unit": "IRR",
        "avg_price": 46100.50
      }
    ]
  },
  "links": {
    "self": "https://your-domain.com/api/prices/range?start_date=2024-01-10&end_date=2024-01-15&page=1&limit=10"
  },
  "meta": {
    "totalRecords": 150,
    "totalPages": 15,
    "currentPage": 1,
    "limitPerPage": 10,
    "startDate": "2024-01-10",
    "endDate": "2024-01-15"
  }
}
```

#### Response Error (400) - پارامترهای مورد نیاز
```json
{
  "status": 400,
  "error": "هم تاریخ شروع و هم تاریخ پایان لازم است."
}
```

#### Response Error (400) - بازه نامعتبر
```json
{
  "status": 400,
  "error": "محدوده تاریخ نامعتبر است. تاریخ شروع نمی تواند بعد از تاریخ پایان باشد."
}
```

#### مثال cURL
```bash
curl -X GET "https://your-domain.com/api/prices/range?start_date=2024-01-01&end_date=2024-01-15&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```---


### 4. قیمت تک ارز

**GET** `/price`

دریافت قیمت یک ارز مشخص در تاریخ مشخص.

#### Headers
```http
Authorization: Bearer <access_token>
```

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | Yes | - | نماد ارز (مثل USD, BTC) |
| `date` | string | Yes | - | تاریخ مورد نظر (YYYY-MM-DD) |

#### Response Success (200)
```json
{
  "status": 200,
  "data": {
    "id": "uuid-string",
    "currency": {
      "name": "طلا",
      "symbol": "GOLD",
      "icon": "gold.png",
      "color": "#fbbf24",
      "category": {
        "id": 3,
        "name": "فلز گرانبها",
        "type": "metal"
      },
      "priority": 10,
      "unit": "IRR"
    },
    "date": "2024-01-15T14:20:00.000Z",
    "price": 2850000.0,
    "bubblePercent": 0.5
  }
}
```

#### Response Error (400) - پارامترهای مورد نیاز
```json
{
  "status": 400,
  "error": "نماد و تاریخ مورد نیاز است"
}
```

#### Response Error (404)
```json
{
  "status": 404,
  "error": "هیچ داده ای برای نماد و تاریخ داده شده یافت نشد."
}
```

#### مثال cURL
```bash
curl -X GET "https://your-domain.com/api/price?symbol=USD&date=2024-01-15" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 5. لیست نمادها

**GET** `/symbols`

دریافت لیست تمام نمادهای موجود در سیستم.

#### Headers
```http
Authorization: Bearer <access_token>
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": [
    {
      "name": "دلار آمریکا",
      "symbol": "USD",
      "category": {
        "id": 1,
        "name": "ارز",
        "type": "currency"
      }
    },
    {
      "name": "بیت کوین",
      "symbol": "BTC",
      "category": {
        "id": 2,
        "name": "رمزارز",
        "type": "crypto"
      }
    },
    {
      "name": "طلا",
      "symbol": "GOLD",
      "category": {
        "id": 3,
        "name": "فلز گرانبها",
        "type": "metal"
      }
    }
  ]
}
```

#### Response Error (500)
```json
{
  "status": 500,
  "error": "خطا در بازیابی نمادها."
}
```

#### مثال cURL
```bash
curl -X GET "https://your-domain.com/api/symbols" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. دسته‌بندی‌ها

**GET** `/categories`

دریافت لیست تمام دسته‌بندی‌های موجود.

#### Headers
```http
Authorization: Bearer <access_token>
```

#### Response Success (200)
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "name": "ارز",
      "type": "currency"
    },
    {
      "id": 2,
      "name": "رمزارز",
      "type": "crypto"
    },
    {
      "id": 3,
      "name": "فلز گرانبها",
      "type": "metal"
    }
  ]
}
```

#### Response Error (500)
```json
{
  "status": 500,
  "error": "خطا در بازیابی دسته‌ها."
}
```

#### مثال cURL
```bash
curl -X GET "https://your-domain.com/api/categories" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```-
--

## ساختار Response

### Response موفق
```json
{
  "status": 200,
  "data": <data_object_or_array>,
  "links": {
    "self": "<current_request_url>"
  },
  "meta": {
    "totalRecords": <number>,
    "totalPages": <number>,
    "currentPage": <number>,
    "limitPerPage": <number>
  }
}
```

### Response خطا
```json
{
  "status": <error_code>,
  "error": "<error_message_in_persian>"
}
```

## Pagination

### پارامترهای Pagination
- **page**: شماره صفحه (شروع از 1)
- **limit**: تعداد آیتم در هر صفحه (پیش‌فرض: 10، حداکثر: 100)

### Metadata
```json
{
  "meta": {
    "totalRecords": 250,      // تعداد کل رکوردها
    "totalPages": 25,         // تعداد کل صفحات
    "currentPage": 1,         // صفحه فعلی
    "limitPerPage": 10        // تعداد آیتم در هر صفحه
  }
}
```

## فیلترها و جستجو

### فیلتر بر اساس نماد
```
GET /api/search?symbol=USD
```

### فیلتر بر اساس دسته‌بندی
```
GET /api/search?category=crypto
```

### ترکیب فیلترها
```
GET /api/search?symbol=BTC&category=crypto&page=1&limit=5
```

## فرمت تاریخ

تمام تاریخ‌ها باید در فرمت **ISO 8601** یا **YYYY-MM-DD** ارسال شوند:

```
2024-01-15
2024-12-31
```

## خطاهای رایج

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

### 404 Not Found
```json
{
  "status": 404,
  "error": "هیچ داده ای برای پارامترهای داده شده یافت نشد"
}
```

### 500 Internal Server Error
```json
{
  "status": 500,
  "error": "خطا در بازیابی داده ها."
}
```

## مثال کامل استفاده

```javascript
// دریافت قیمت‌های امروز
const todayPrices = await fetch('/api/prices?last_price=true', {
  headers: { 
    'Authorization': `Bearer ${accessToken}` 
  }
});

// جستجو برای دلار
const usdPrices = await fetch('/api/search?symbol=USD&page=1&limit=5', {
  headers: { 
    'Authorization': `Bearer ${accessToken}` 
  }
});

// قیمت‌های هفته گذشته
const weeklyPrices = await fetch('/api/prices/range?start_date=2024-01-08&end_date=2024-01-15', {
  headers: { 
    'Authorization': `Bearer ${accessToken}` 
  }
});

// قیمت طلا در تاریخ مشخص
const goldPrice = await fetch('/api/price?symbol=GOLD&date=2024-01-15', {
  headers: { 
    'Authorization': `Bearer ${accessToken}` 
  }
});

// لیست تمام نمادها
const symbols = await fetch('/api/symbols', {
  headers: { 
    'Authorization': `Bearer ${accessToken}` 
  }
});
```

## نکات مهم

1. **احراز هویت**: تمام endpoint ها نیاز به JWT token دارند
2. **Rate Limiting**: محدودیت درخواست ممکن است اعمال شود
3. **Pagination**: برای داده‌های حجیم از pagination استفاده کنید
4. **Date Format**: از فرمت YYYY-MM-DD استفاده کنید
5. **Error Handling**: همیشه status code ها را بررسی کنید
6. **Caching**: داده‌ها ممکن است cache شوند
7. **Fallback**: اگر داده‌ای برای تاریخ مشخص وجود نداشته باشد، آخرین داده‌های موجود برگردانده می‌شود