const db = require("../config/db");
const PriceModel = require("../models/priceModel");

async function getDataByDate(date, lastPrice, limit, offset) {
  if (!date) {
    date = new Date().toISOString().split("T")[0];
  }

  const today = new Date().toISOString().split("T")[0];
  if (date > today) {
    throw new Error("Date cannot be in the future.");
  }

  if (lastPrice) {
    const query = `
  SELECT p1.*, cm.priority
  FROM prices p1
  INNER JOIN (
    SELECT symbol, MAX(date) AS max_date
    FROM prices
    WHERE DATE(date) = ?
    GROUP BY symbol
  ) p2 ON p1.symbol = p2.symbol AND p1.date = p2.max_date
  LEFT JOIN currencies_meta cm ON p1.symbol = cm.symbol
  ORDER BY cm.priority ASC
    `;
    const [rows] = await db.query(query, [date]);

    // 🔁 اگر دیتایی برای امروز نبود، fallback به آخرین قیمت کلی با ترتیب priority
    if (rows.length === 0 && date === today) {
      const fallbackRows = await getLatestPricesForAllSymbols();
      return {
        data: fallbackRows.map((row) => PriceModel.fromDatabase(row)),
        totalRecords: fallbackRows.length,
        requestedDate: null,
      };
    }

    return {
      data: rows.map((row) => PriceModel.fromDatabase(row)),
      totalRecords: rows.length,
      requestedDate: date,
    };
  }

  // حالت معمولی که بر اساس تاریخ و صفحه‌بندی کار می‌کنه
  const countQuery = `SELECT COUNT(*) AS totalRecords FROM prices WHERE DATE(date) = ?`;
  const [[{ totalRecords }]] = await db.query(countQuery, [date]);

  const dataQuery = `
  SELECT p.*, cm.priority
  FROM prices p
  LEFT JOIN currencies_meta cm ON p.symbol = cm.symbol
  WHERE DATE(p.date) = ?
  ORDER BY cm.priority ASC, p.date DESC
  LIMIT ? OFFSET ?
 `;
  const [result] = await db.query(dataQuery, [date, limit, offset]);

  return {
    data: result.map((row) => PriceModel.fromDatabase(row)),
    totalRecords,
    requestedDate: date,
  };
}

async function getLatestPricesForAllSymbols() {
  const query = `
  SELECT p1.*, cm.priority
  FROM prices p1
  INNER JOIN (
    SELECT symbol, MAX(date) AS max_date
    FROM prices
    GROUP BY symbol
  ) p2 ON p1.symbol = p2.symbol AND p1.date = p2.max_date
  LEFT JOIN currencies_meta cm ON p1.symbol = cm.symbol
  ORDER BY cm.priority ASC
    `;
  const [rows] = await db.query(query);
  return rows;
}

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
async function getDataInRange(startDate, endDate, limit, offset) {
  if (startDate > endDate) {
    throw new Error(
      "Invalid date range. The start date cannot be after the end date."
    );
  }

  const countQuery = `
        SELECT COUNT(*) AS totalRecords FROM prices 
        WHERE date BETWEEN ? AND ?
    `;
  const [[{ totalRecords }]] = await db.query(countQuery, [startDate, endDate]);

  const dataQuery = `
  SELECT p.*, cm.priority
  FROM prices p
  LEFT JOIN currencies_meta cm ON p.symbol = cm.symbol
  WHERE p.date BETWEEN ? AND ?
  ORDER BY cm.priority ASC, p.date ASC
  LIMIT ? OFFSET ?
   `;
  const [results] = await db.query(dataQuery, [
    startDate,
    endDate,
    limit,
    offset,
  ]);

  const avgQuery = `
        SELECT symbol, category, unit, AVG(price) AS avg_price 
        FROM prices 
        WHERE date BETWEEN ? AND ?
        GROUP BY symbol, category, unit
        ORDER BY avg_price DESC
    `;
  const [avgResults] = await db.query(avgQuery, [startDate, endDate]);

  return {
    data: results.map((row) => PriceModel.fromDatabase(row)),
    totalRecords,
    startDate,
    endDate,
    avgPrices: avgResults,
  };
}

// 📌 تابع ذخیره‌سازی داده‌ها در دیتابیس
async function insertPrice(name, symbol, category, price, unit, date) {
  console.log(
    `🔍 Checking insert for ${symbol} at ${new Date().toLocaleString()}`
  );

  const query = `
        INSERT INTO prices (name, symbol, category, date, price, unit)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
  try {
    await db.query(query, [name, symbol, category, date, price, unit]);
    console.log(`✅ Inserted ${name} (${symbol}) into ${category}`);
  } catch (error) {
    console.error(`❌ Error inserting ${name} into ${category}:`, error);
  }
}

async function searchPrices(
  symbol = null,
  category = null,
  page = 1,
  limit = 10
) {
  let whereClause = [];
  let queryParams = [];

  if (symbol) {
    whereClause.push("symbol = ?");
    queryParams.push(symbol);
  }
  if (category) {
    whereClause.push("category = ?");
    queryParams.push(category);
  }

  const whereSQL = whereClause.length
    ? `WHERE ${whereClause.join(" AND ")}`
    : "";

  const countQuery = `SELECT COUNT(*) AS totalRecords FROM prices ${whereSQL}`;
  const [[{ totalRecords }]] = await db.query(countQuery, queryParams);

  const offset = (page - 1) * limit;
  queryParams.push(limit, offset);

  const dataQuery = `
  SELECT p.*, cm.priority
  FROM prices p
  LEFT JOIN currencies_meta cm ON p.symbol = cm.symbol
  ${whereSQL}
  ORDER BY cm.priority ASC, p.date DESC
  LIMIT ? OFFSET ?
    `;
  const [results] = await db.query(dataQuery, queryParams);

  return {
    data: results.map((row) => PriceModel.fromDatabase(row)),
    totalRecords,
  };
}

async function getSymbols() {
  const query = `SELECT symbol, name, category FROM currencies_meta ORDER BY priority ASC`;
  const [symbols] = await db.query(query);
  return symbols;
}

async function getPriceBySymbolAndDate(symbol, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const query = `
SELECT p.*, cm.priority
FROM prices p
LEFT JOIN currencies_meta cm ON p.symbol = cm.symbol
WHERE p.symbol = ? AND p.date BETWEEN ? AND ?
ORDER BY p.date DESC
LIMIT 1
    `;
  const [rows] = await db.query(query, [symbol, start, end]);
  return rows.length > 0 ? PriceModel.fromDatabase(rows[0]) : null;
}

async function getCategories() {
  const query = `SELECT DISTINCT category FROM prices ORDER BY category ASC`;
  const [categories] = await db.query(query);
  return categories.map((c) => c.category);
}

async function hasDataForDate(date) {
  const [rows] = await db.query(
    "SELECT COUNT(*) as count FROM prices WHERE DATE(date) = ?",
    [date]
  );
  return rows[0].count > 0;
}

async function updateUserEmailAndToken(userId, email, token) {
  const query = `
    UPDATE users
    SET email = ?, email_verification_token = ?, email_verified_at = NULL
    WHERE id = ?
  `;
  await db.query(query, [email, token, userId]);
}

async function getUserByEmailToken(token) {
  const [rows] = await db.query(
    "SELECT * FROM users WHERE email_verification_token = ?",
    [token]
  );
  return rows[0];
}

async function verifyUserEmail(userId) {
  await db.query(
    "UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL WHERE id = ?",
    [userId]
  );
}

async function createUser(username) {
  const [result] = await db.query("INSERT INTO users (username) VALUES (?)", [
    username,
  ]);
  return result;
}

async function getUserByUsername(username) {
  const [rows] = await db.query(
    `SELECT id, username, email, email_verified_at, phone, name, image, role FROM users WHERE username = ?`,
    [username]
  );
  return rows[0];
}

async function updateUserRefreshToken(userId, token) {
  await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [token, userId]);
}

async function getUserById(userId) {
  const [rows] = await db.query(
    `SELECT id, username, email, email_verified_at, phone, name, image, role FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0];
}

async function updateUserProfile(userId, name, image) {
  await db.query("UPDATE users SET name = ?, image = ? WHERE id = ?", [name, image, userId]);
}

async function clearUserRefreshToken(refreshToken) {
  await db.query("UPDATE users SET refresh_token = NULL WHERE refresh_token = ?", [refreshToken]);
}

// ✅ مرحله ایجاد رکورد جدید برای ارسال کد
async function createPhoneVerification(userId, phone, code, expiresAt) {
  const query = `
    INSERT INTO phone_verifications (user_id, phone, code, expires_at)
    VALUES (?, ?, ?, ?)
  `;
  await db.query(query, [userId, phone, code, expiresAt]);
}

// ✅ مرحله بررسی رکورد ذخیره‌شده برای تایید
async function getPhoneVerification(userId, phone) {
  const query = `
    SELECT * FROM phone_verifications
    WHERE user_id = ? AND phone = ?
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const [rows] = await db.query(query, [userId, phone]);
  return rows[0];
}

// ✅ مرحله تایید کد ارسال شده
async function verifyPhoneCode(userId, phone, code) {
  const query = `
    UPDATE phone_verifications
    SET is_verified = true
    WHERE user_id = ? AND phone = ? AND code = ? AND is_verified = false
  `;
  const [result] = await db.query(query, [userId, phone, code]);
  return result.affectedRows > 0;
}

// ✅ مرحله بروزرسانی شماره تلفن در جدول users در صورت تایید نهایی
async function markPhoneAsVerified(userId, phone) {
  const query = `UPDATE users SET phone = ?, is_phone_verified = true WHERE id = ?`;
  await db.query(query, [phone, userId]);
}

async function countPhoneVerificationsLast5Minutes(userId) {
  const query = `
    SELECT COUNT(*) as count
    FROM phone_verifications
    WHERE user_id = ? AND created_at >= NOW() - INTERVAL 5 MINUTE
  `;
  const [rows] = await db.query(query, [userId]);
  return rows[0].count;
}

module.exports = {
  getDataByDate,
  getDataInRange,
  insertPrice,
  searchPrices,
  getSymbols,
  getCategories,
  getPriceBySymbolAndDate,
  hasDataForDate,
  updateUserEmailAndToken,
  getUserByEmailToken,
  verifyUserEmail,
  createUser,
  getUserByUsername,
  updateUserRefreshToken,
  getUserById,
  updateUserProfile,
  clearUserRefreshToken,
  createPhoneVerification,
  getPhoneVerification,
  verifyPhoneCode,
  markPhoneAsVerified,
  countPhoneVerificationsLast5Minutes,
};
