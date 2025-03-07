module.exports = {
  apps: [
    {
      name: "finoo-api", // سرویس اصلی API
      script: "server.js", // مسیر فایل اصلی
      env: {
        NODE_ENV: "production",
        PORT: 3000 // پورت API (مطمئن شوید با کدتان هماهنگ باشد)
      },
      autorestart: true,
      max_memory_restart: "1G" // محدودیت حافظه
    },
    {
      name: "finoo-data-fetcher", // سرویس جمع‌آوری داده
      script: "jobs/fetchData.js", // مسیر فایل fetchData
      env: {
        NODE_ENV: "production",
      },
    }
  ]
};