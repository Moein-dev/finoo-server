const db = require("../config/db");
const PriceModel = require("../models/priceModel");
const CurrencyMetaModel = require("../models/currencyMetaModel");

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
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category,
      c.icon,
      c.server_key,
      c.unit,
      COALESCE(cm.priority, 100) AS priority,
      cm.symbol
    FROM new_prices np
    INNER JOIN (
      SELECT currency_id, MAX(created_at) AS max_date
      FROM new_prices
      WHERE DATE(created_at) = ?
      GROUP BY currency_id
    ) latest ON np.currency_id = latest.currency_id AND np.created_at = latest.max_date
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN currencies_meta cm ON c.server_key = cm.server_symbol
    ORDER BY priority ASC
    `;
    const [rows] = await db.query(query, [date]);

    // 🔁 اگر دیتایی برای امروز نبود، fallback به آخرین قیمت کلی با ترتیب priority
    if (rows.length === 0 && date === today) {
      const fallbackRows = await getLatestPricesForAllCurrencies();
      return {
        data: fallbackRows.map((row) => formatPriceResponse(row)),
        totalRecords: fallbackRows.length,
        requestedDate: null,
      };
    }

    return {
      data: rows.map((row) => formatPriceResponse(row)),
      totalRecords: rows.length,
      requestedDate: date,
    };
  }
  // حالت معمولی که بر اساس تاریخ و صفحه‌بندی کار می‌کنه
  const countQuery = `
    SELECT COUNT(*) AS totalRecords 
    FROM new_prices 
    WHERE DATE(created_at) = ?
  `;
  const [[{ totalRecords }]] = await db.query(countQuery, [date]);

  const dataQuery = `
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category,
      c.icon,
      c.server_key,
      c.unit,
      COALESCE(cm.priority, 100) AS priority,
      cm.symbol
    FROM new_prices np
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN currencies_meta cm ON c.server_key = cm.server_symbol
    WHERE DATE(np.created_at) = ?
    ORDER BY priority ASC, np.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [result] = await db.query(dataQuery, [date, limit, offset]);

  return {
    data: result.map((row) => formatPriceResponse(row)),
    totalRecords,
    requestedDate: date,
  };
}


  function formatPriceResponse(row) {
  return {
    id: row.id,
    currency: {
      name: row.name,
      symbol: row.symbol,
      icon: row.icon,
      color: row.color || "#000000",
      category: row.category,
      priority: row.priority,
      unit: row.unit
    },
    date: row.date,
    price: parseFloat(row.price)
  };
}

// تابع کمکی برای دریافت آخرین قیمت‌ها برای همه ارزها
async function getLatestPricesForAllCurrencies() {
  const query = `
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category,
      c.icon,
      c.server_key,
      c.unit,
      COALESCE(cm.priority, 100) AS priority,
      cm.symbol
    FROM new_prices np
    INNER JOIN (
      SELECT currency_id, MAX(created_at) AS max_date
      FROM new_prices
      GROUP BY currency_id
    ) latest ON np.currency_id = latest.currency_id AND np.created_at = latest.max_date
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN currencies_meta cm ON c.server_key = cm.server_symbol
    ORDER BY priority ASC
  `;
  
  const [rows] = await db.query(query);
  return rows;
}  


// تابع کمکی برای دریافت آخرین قیمت‌ها برای همه ارزها
async function getLatestPricesForAllCurrencies() {
  const query = `
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category,
      c.icon,
      c.server_key,
      c.unit,
      COALESCE(cm.priority, 100) AS priority,
      cm.symbol
    FROM new_prices np
    INNER JOIN (
      SELECT currency_id, MAX(created_at) AS max_date
      FROM new_prices
      GROUP BY currency_id
    ) latest ON np.currency_id = latest.currency_id AND np.created_at = latest.max_date
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN currencies_meta cm ON c.server_key = cm.server_symbol
    ORDER BY priority ASC
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
        SELECT COUNT(*) AS totalRecords FROM new_prices
        WHERE created_at BETWEEN ? AND ?
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

async function findCurrencyId(symbol) {
  try {
    const query = `SELECT id FROM currencies WHERE symbol = ?`;
    const [results] = await db.query(query, [symbol]);
    
    if (!results || results.length === 0) {
      console.error(`❌ No currency found with symbol: ${symbol}`);
      return null;
    }
    
    return results[0].id;
  } catch (error) {
    console.error(`❌ Error finding currency_id for symbol ${symbol}:`, error);
    return null;
  }
}

/**
 * درج قیمت جدید در جدول new_prices
 * @param {string} name - نام ارز
 * @param {string} symbol - نماد ارز (server_key)
 * @param {string} category - دسته‌بندی ارز
 * @param {number} price - قیمت ارز
 * @param {string} unit - واحد قیمت
 * @param {Date|string} date - تاریخ قیمت
 * @param {number|null} bubblePercent - درصد حباب (اختیاری)
 * @returns {Promise<void>}
 */
async function insertPrice(name, symbol, price, date, bubblePercent = null) {
  console.log(
    `🔍 Checking insert for ${symbol} at ${new Date().toLocaleString()}`
  );

  try {
    // پیدا کردن currency_id با استفاده از متد جداگانه
    const currencyId = await findCurrencyId(symbol);
    
    if (!currencyId) {
      console.error(`❌ Cannot insert price for ${name} (${symbol}): currency not found`);
      return;
    }
    
    // تولید UUID برای id
    const uuid = require('uuid').v4();
    
    // درج در جدول new_prices
    const insertQuery = `
      INSERT INTO new_prices (id, currency_id, price, created_at, percent_bubble)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await db.query(insertQuery, [uuid, currencyId, price, date || new Date(), bubblePercent]);
    console.log(`✅ Inserted price for ${name} (${symbol}) with currency_id: ${currencyId}`);
  } catch (error) {
    console.error(`❌ Error inserting price for ${name}:`, error);
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
  try {
    const query = "SELECT * FROM currencies_meta"; // کوئری برای دریافت تمام داده‌ها
    const [rows] = await db.query(query);

    // تبدیل هر رکورد به نمونه‌ای از CurrencyMetaModel
    return rows.map(
      (row) =>
        new CurrencyMetaModel({
          symbol: row.symbol,
          name: row.name,
          category: row.category,
          icon: row.icon,
          use_auto_icon: row.use_auto_icon,
          priority: row.priority,
          color: row.color,
          svg_icon: row.svg_icon,
        })
    );
  } catch (error) {
    console.error("Error fetching currencies from DB:", error.message);
    throw error;
  }
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
  try {
    const query = "SELECT DISTINCT category FROM currencies_meta"; // کوئری برای دریافت دسته‌بندی‌های یکتا
    const [rows] = await db.query(query); // اجرای کوئری
    return rows.map((row) => row.category); // بازگرداندن دسته‌بندی‌ها
  } catch (error) {
    console.error("Error fetching categories from DB:", error.message);
    throw error; // خطا را به فراخوانی‌کننده می‌دهیم
  }
}

async function getAllCurrencies() {
  try {
    const query = "SELECT * FROM currencies_meta"; // کوئری برای دریافت تمام داده‌ها
    const [rows] = await db.query(query); // اجرای کوئری
    // تبدیل هر رکورد به نمونه‌ای از CurrencyMetaModel
    return rows.map((row) => new CurrencyMetaModel(row));
  } catch (error) {
    console.error("Error fetching currencies from DB:", error.message);
    throw error; // خطا را به فراخوانی‌کننده می‌دهیم
  }
}

async function hasDataForDate(date) {
  const [rows] = await db.query(
    "SELECT COUNT(*) as count FROM new_prices WHERE DATE(created_at) = ?",
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
  await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [
    token,
    userId,
  ]);
}

async function getUserById(userId) {
  const [rows] = await db.query(
    `SELECT id, username, email, email_verified_at, phone, name, image, role FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0];
}

async function updateUserProfile(userId, name, image) {
  await db.query("UPDATE users SET name = ?, image = ? WHERE id = ?", [
    name,
    image,
    userId,
  ]);
}

async function clearUserRefreshToken(refreshToken) {
  await db.query(
    "UPDATE users SET refresh_token = NULL WHERE refresh_token = ?",
    [refreshToken]
  );
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
  getAllCurrencies,
};
