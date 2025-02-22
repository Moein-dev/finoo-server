require("dotenv").config();
const mysql = require("mysql2");

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// بررسی مقدار متغیرهای محیطی
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.error("❌ Database configuration is missing! Check your .env file.");
    process.exit(1); // سرور را متوقف کن، چون اجرای بدون دیتابیس ممکن نیست.
}

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = pool.promise(); // استفاده از Promise برای پشتیبانی از async/await

// ✅ متد برای بررسی صحت اتصال دیتابیس
async function pingDatabase() {
    try {
        const [rows] = await db.query("SELECT 1");
        console.log("✅ Database connection is active.");
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1); // اگر اتصال برقرار نشد، سرور متوقف شود.
    }
}

// اجرای `pingDatabase` برای بررسی اتصال دیتابیس در هنگام راه‌اندازی سرور
pingDatabase();

module.exports = db;
