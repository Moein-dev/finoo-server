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
```