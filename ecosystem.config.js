module.exports = {
  apps: [
    {
      name: "finoo-api", // سرویس اصلی API
      script: "./server.js", // مسیر فایل اصلی
      env: {
        NODE_ENV: "production",
        PORT: 3000 // پورت API (مطمئن شوید با کدتان هماهنگ باشد)
      },
      autorestart: true,
      max_memory_restart: "1G" // محدودیت حافظه
    },
    {
      name: "finoo-data-fetcher",
      script: "./jobs/fetchData.js",
      // 🔴 زمانبندی دقیق برای ساعت ۶ صبح تهران
      cron_restart: "30 2 * * *", // معادل ۶ صبح تهران (UTC+3:30)
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Tehran" // تنظیم منطقه زمانی برای محاسبه cron
      },
      autorestart: false // غیرفعال کردن ریاستارت خودکار
    }
  ]
};