require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = pool.promise(); // **✅ این خط باعث می‌شود `db` مقدار صحیح داشته باشد.**
module.exports = db; // **✅ فقط این خط را صادر کن، خط دوم که `module.exports = db;` بود حذف شد!**
