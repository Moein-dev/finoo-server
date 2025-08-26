const db = require("../config/db");
const PriceModel = require("../models/priceModel");
const CurrencyModel = require("../models/currencyModel");
const SymbolModel = require("../models/symbolModel");
const CategoryModel = require("../models/categoryModel");
const UserModel = require("../models/userModel");
const { generateRandomUsername } = require("../utils/codeGenerators");

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
    const query = `
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category_id,
      c.icon,
      c.server_key,
      c.unit,
      c.priority,
      c.symbol,
      c.color,
      cat.id as cat_id, cat.name as cat_name, cat.type as cat_type
    FROM new_prices np
    INNER JOIN (
      SELECT currency_id, MAX(created_at) AS max_date
      FROM new_prices
      WHERE DATE(created_at) = ?
      GROUP BY currency_id
    ) latest ON np.currency_id = latest.currency_id AND np.created_at = latest.max_date
    INNER JOIN currencies c ON np.currency_id = c.id
    ${categoryJoin}
    ORDER BY c.priority ASC
    `;
    const [rows] = await db.query(query, [date]);
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
        const category = row.cat_id
          ? new CategoryModel({
              id: row.cat_id,
              name: row.cat_name,
              type: row.cat_type,
            })
          : null;
        return PriceModel.fromDatabase({ ...row, category });
      }),
      totalRecords: rows.length,
      requestedDate: date,
    };
  }
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
      c.category_id,
      c.icon,
      c.server_key,
      c.unit,
      c.priority,
      c.symbol,
      c.color,
      cat.id as cat_id, cat.name as cat_name, cat.type as cat_type
    FROM new_prices np
    INNER JOIN currencies c ON np.currency_id = c.id
    ${categoryJoin}
    WHERE DATE(np.created_at) = ?
    ORDER BY c.priority ASC, np.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [result] = await db.query(dataQuery, [date, limit, offset]);
  return {
    data: result.map((row) => {
      const category = row.cat_id
        ? new CategoryModel({
            id: row.cat_id,
            name: row.cat_name,
            type: row.cat_type,
          })
        : null;
      return PriceModel.fromDatabase({ ...row, category });
    }),
    totalRecords,
    requestedDate: date,
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
      c.category_id,
      c.icon,
      c.server_key,
      c.unit,
      c.priority,
      c.symbol,
      c.color,
      cat.id as cat_id, cat.name as cat_name, cat.type as cat_type
    FROM new_prices np
    INNER JOIN (
      SELECT currency_id, MAX(created_at) AS max_date
      FROM new_prices
      GROUP BY currency_id
    ) latest ON np.currency_id = latest.currency_id AND np.created_at = latest.max_date
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    ORDER BY c.priority ASC
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
    SELECT COUNT(*) AS totalRecords 
    FROM new_prices
    WHERE created_at BETWEEN ? AND ?
  `;
  const [[{ totalRecords }]] = await db.query(countQuery, [startDate, endDate]);
  const dataQuery = `
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category_id,
      c.icon,
      c.server_key,
      c.unit,
      c.priority,
      c.symbol,
      c.color,
      cat.id as cat_id, cat.name as cat_name, cat.type as cat_type
    FROM new_prices np
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE np.created_at BETWEEN ? AND ?
    ORDER BY c.priority ASC, np.created_at ASC
    LIMIT ? OFFSET ?
  `;
  const [results] = await db.query(dataQuery, [
    startDate,
    endDate,
    limit,
    offset,
  ]);
  const avgQuery = `
    SELECT 
      c.symbol, 
      c.category_id, 
      c.unit, 
      AVG(np.price) AS avg_price 
    FROM new_prices np
    INNER JOIN currencies c ON np.currency_id = c.id
    WHERE np.created_at BETWEEN ? AND ?
    GROUP BY c.symbol, c.category_id, c.unit
    ORDER BY avg_price DESC
  `;
  const [avgResults] = await db.query(avgQuery, [startDate, endDate]);
  return {
    data: results.map((row) => {
      const category = row.cat_id
        ? new CategoryModel({
            id: row.cat_id,
            name: row.cat_name,
            type: row.cat_type,
          })
        : null;
      return PriceModel.fromDatabase({ ...row, category });
    }),
    totalRecords,
    startDate,
    endDate,
    avgPrices: avgResults,
  };
}

async function findCurrencyId(serverKey) {
  try {
    const query = `SELECT id FROM currencies WHERE server_key = ?`;
    const [results] = await db.query(query, [serverKey]);

    if (!results || results.length === 0) {
      console.error(`❌ No currency found with server_key: ${serverKey}`);
      return null;
    }

    return results[0].id;
  } catch (error) {
    console.error(
      `❌ Error finding currency_id for server_key ${serverKey}:`,
      error
    );
    return null;
  }
}

/**
 * درج قیمت جدید در جدول new_prices
 * @param {string} name - نام ارز
 * @param {string} serverKey - کلید سرور ارز
 * @param {number} price - قیمت ارز
 * @param {Date|string} date - تاریخ قیمت
 * @param {number|null} bubblePercent - درصد حباب (اختیاری)
 * @returns {Promise<void>}
 */
async function insertPrice(name, serverKey, price, date, bubblePercent = null) {
  console.log(
    `🔍 Checking insert for ${serverKey} at ${new Date().toLocaleString()}`
  );

  try {
    // پیدا کردن currency_id با استفاده از متد جداگانه
    const currencyId = await findCurrencyId(serverKey);

    if (!currencyId) {
      console.error(
        `❌ Cannot insert price for ${name} (${serverKey}): currency not found`
      );
      return;
    }

    // تولید UUID برای id
    const uuid = require("uuid").v4();

    // درج در جدول new_prices
    const insertQuery = `
      INSERT INTO new_prices (id, currency_id, price, created_at, percent_bubble)
      VALUES (?, ?, ?, ?, ?)
    `;

    await db.query(insertQuery, [
      uuid,
      currencyId,
      price,
      date || new Date(),
      bubblePercent,
    ]);
    console.log(
      `✅ Inserted price for ${name} (${serverKey}) with currency_id: ${currencyId}`
    );
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
    whereClause.push("c.symbol = ?");
    queryParams.push(symbol);
  }
  if (category) {
    whereClause.push("cat.type = ?");
    queryParams.push(category);
  }
  const whereSQL = whereClause.length
    ? `WHERE ${whereClause.join(" AND ")}`
    : "";
  const countQuery = `
    SELECT COUNT(*) AS totalRecords 
    FROM new_prices np
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    ${whereSQL}
  `;
  const [[{ totalRecords }]] = await db.query(countQuery, queryParams);
  const offset = (page - 1) * limit;
  queryParams.push(limit, offset);
  const dataQuery = `
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category_id,
      c.icon,
      c.server_key,
      c.unit,
      c.priority,
      c.symbol,
      c.color,
      cat.id as cat_id, cat.name as cat_name, cat.type as cat_type
    FROM new_prices np
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    ${whereSQL}
    ORDER BY c.priority ASC, np.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [results] = await db.query(dataQuery, queryParams);
  return {
    data: results.map((row) => {
      const category = row.cat_id
        ? new CategoryModel({
            id: row.cat_id,
            name: row.cat_name,
            type: row.cat_type,
          })
        : null;
      return PriceModel.fromDatabase({ ...row, category });
    }),
    totalRecords,
  };
}

async function getSymbols() {
  try {
    const query = `SELECT c.*, cat.id as cat_id, cat.name as cat_name, cat.type as cat_type FROM currencies c LEFT JOIN categories cat ON c.category_id = cat.id`;
    const [rows] = await db.query(query);
    return rows.map(
      (row) =>
        new SymbolModel({
          name: row.name,
          symbol: row.symbol,
          category: row.cat_id
            ? new CategoryModel({
                id: row.cat_id,
                name: row.cat_name,
                type: row.cat_type,
              })
            : null,
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
    SELECT 
      np.id, 
      np.price, 
      np.created_at AS date,
      np.percent_bubble,
      c.id AS currency_id,
      c.name,
      c.category_id,
      c.icon,
      c.server_key,
      c.unit,
      c.priority,
      c.symbol,
      c.color,
      cat.id as cat_id, cat.name as cat_name, cat.type as cat_type
    FROM new_prices np
    INNER JOIN currencies c ON np.currency_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE c.symbol = ? AND np.created_at BETWEEN ? AND ?
    ORDER BY np.created_at DESC
    LIMIT 1
  `;
  const [rows] = await db.query(query, [symbol, start, end]);
  return rows.length > 0
    ? PriceModel.fromDatabase({
        ...rows[0],
        category: rows[0].cat_id
          ? new CategoryModel({
              id: rows[0].cat_id,
              name: rows[0].cat_name,
              type: rows[0].cat_type,
            })
          : null,
      })
    : null;
}

async function getCategories() {
  try {
    const query = "SELECT * FROM categories";
    const [rows] = await db.query(query);
    return rows.map(
      (row) =>
        new CategoryModel({
          id: row.id,
          name: row.name,
          type: row.type,
        })
    );
  } catch (error) {
    console.error("Error fetching categories from DB:", error.message);
    throw error;
  }
}

async function getAllCurrencies() {
  try {
    const query = "SELECT * FROM currencies";
    const [rows] = await db.query(query);
    // گرفتن همه category_idها
    const categoryIds = [...new Set(rows.map((row) => row.category_id))];
    let categories = [];
    if (categoryIds.length > 0) {
      const [catRows] = await db.query(
        `SELECT * FROM categories WHERE id IN (${categoryIds
          .map(() => "?")
          .join(",")})`,
        categoryIds
      );
      categories = catRows.map((row) => new CategoryModel(row));
    }
    // ساخت map برای دسترسی سریع
    const catMap = Object.fromEntries(categories.map((cat) => [cat.id, cat]));
    // تبدیل هر رکورد به نمونه‌ای از CurrencyModel
    return rows.map(
      (row) =>
        new CurrencyModel({
          ...row,
          category: catMap[row.category_id] || null,
        })
    );
  } catch (error) {
    console.error("Error fetching currencies from DB:", error.message);
    throw error;
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
  return rows[0] ? UserModel.fromDatabase(rows[0]) : null;
}

async function verifyUserEmail(userId) {
  await db.query(
    "UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL WHERE id = ?",
    [userId]
  );
}

async function createUser(username, name = null) {
  const [result] = await db.query(
    "INSERT INTO users (username, name) VALUES (?, ?)",
    [username, name]
  );
  return result;
}

// ✅ ایجاد کاربر جدید با شماره تلفن
async function createUserWithPhone(phone, name = null) {
  // تولید نام کاربری تصادفی
  let username;
  let userExists;
  do {
    username = generateRandomUsername();
    userExists = await getUserByUsername(username);
  } while (userExists);

  const [result] = await db.query(
    "INSERT INTO users (username, phone, name, is_phone_verified) VALUES (?, ?, ?, true)",
    [username, phone, name]
  );

  // بازگرداندن کاربر ایجاد شده
  const [userRows] = await db.query("SELECT * FROM users WHERE id = ?", [
    result.insertId,
  ]);

  return userRows[0] ? UserModel.fromDatabase(userRows[0]) : null;
}

async function getUserByUsername(username) {
  const [rows] = await db.query(
    `SELECT id, username, email, email_verified_at, phone, name, image, role FROM users WHERE username = ?`,
    [username]
  );
  return rows[0] ? UserModel.fromDatabase(rows[0]) : null;
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
  return rows[0] ? UserModel.fromDatabase(rows[0]) : null;
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

// ✅ بررسی OTP با قابلیت one-time use
async function getValidPhoneVerification(userId, phone, code) {
  const query = `
    SELECT * FROM phone_verifications
    WHERE user_id = ? AND phone = ? AND code = ?
      AND expires_at > NOW()
      AND is_used = FALSE
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const [rows] = await db.query(query, [userId, phone, code]);
  return rows[0];
}

// ✅ علامت‌گذاری OTP به عنوان استفاده شده
async function markOTPAsUsed(verificationId) {
  const query = `
    UPDATE phone_verifications
    SET is_used = TRUE
    WHERE id = ?
  `;
  await db.query(query, [verificationId]);
}

// ✅ افزایش تعداد تلاش‌های ناموفق
async function incrementFailedAttempts(userId, phone) {
  const query = `
    UPDATE phone_verifications
    SET attempts = attempts + 1
    WHERE user_id = ? AND phone = ?
      AND expires_at > NOW()
      AND is_used = FALSE
    ORDER BY created_at DESC
    LIMIT 1
  `;
  await db.query(query, [userId, phone]);
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

async function getUserByPhone(phone) {
  const [rows] = await db.query(`SELECT * FROM users WHERE phone = ? LIMIT 1`, [
    phone,
  ]);
  return rows[0] ? UserModel.fromDatabase(rows[0]) : null;
}

// ✅ Security Events Management
async function logSecurityEvent(
  eventType,
  userId = null,
  ipAddress = null,
  userAgent = null,
  details = null
) {
  const query = `
    INSERT INTO security_events (event_type, user_id, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?)
  `;
  await db.query(query, [
    eventType,
    userId,
    ipAddress,
    userAgent,
    JSON.stringify(details),
  ]);
}

async function getSecurityEvents(
  eventType = null,
  userId = null,
  limit = 100,
  offset = 0
) {
  let whereClause = [];
  let queryParams = [];

  if (eventType) {
    whereClause.push("event_type = ?");
    queryParams.push(eventType);
  }

  if (userId) {
    whereClause.push("user_id = ?");
    queryParams.push(userId);
  }

  const whereSQL = whereClause.length
    ? `WHERE ${whereClause.join(" AND ")}`
    : "";

  queryParams.push(limit, offset);

  const query = `
    SELECT * FROM security_events
    ${whereSQL}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.query(query, queryParams);
  return rows.map((row) => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : null,
  }));
}

async function countSecurityEvents(eventType = null, userId = null) {
  let whereClause = [];
  let queryParams = [];

  if (eventType) {
    whereClause.push("event_type = ?");
    queryParams.push(eventType);
  }

  if (userId) {
    whereClause.push("user_id = ?");
    queryParams.push(userId);
  }

  const whereSQL = whereClause.length
    ? `WHERE ${whereClause.join(" AND ")}`
    : "";

  const query = `SELECT COUNT(*) as count FROM security_events ${whereSQL}`;
  const [rows] = await db.query(query, queryParams);
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
  createUserWithPhone,
  getUserByUsername,
  updateUserRefreshToken,
  getUserById,
  updateUserProfile,
  clearUserRefreshToken,
  createPhoneVerification,
  getPhoneVerification,
  getValidPhoneVerification,
  markOTPAsUsed,
  incrementFailedAttempts,
  verifyPhoneCode,
  markPhoneAsVerified,
  countPhoneVerificationsLast5Minutes,
  getAllCurrencies,
  getUserByPhone,
  logSecurityEvent,
  getSecurityEvents,
  countSecurityEvents,
};
