const db = require("../config/db");
const jwt = require("jsonwebtoken");

/**
 * ثبت نام کاربر
 */
async function registerUser(username) {
  try {
      const [existingUser] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
      if (existingUser.length > 0) {
          throw new Error("Username already taken");
      }

      const [result] = await db.query("INSERT INTO users (username) VALUES (?)", [username]);
      return result.insertId;
  } catch (error) {
      throw error;
  }
}

/**
* ورود کاربر و تولید توکن
*/
async function loginUser(username) {
  try {
      const [user] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
      if (user.length === 0) {
          throw new Error("Invalid username");
      }

      const userId = user[0].id;
      const accessToken = jwt.sign({ id: userId, username }, process.env.SECRET_KEY, { expiresIn: "30d" });
      const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_SECRET, { expiresIn: "60d" });

      await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, userId]);

      return { accessToken, refreshToken };
  } catch (error) {
      throw error;
  }
}

/**
* بررسی و تمدید `accessToken` با `refreshToken`
*/
async function refreshAccessToken(refreshToken) {
  try {
      if (!refreshToken) {
          throw new Error("Refresh token is required");
      }

      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const [user] = await db.query("SELECT id FROM users WHERE id = ? AND refresh_token = ?", [decoded.id, refreshToken]);

      if (!user.length) {
          throw new Error("Invalid refresh token");
      }

      const newAccessToken = jwt.sign({ id: user[0].id }, process.env.SECRET_KEY, { expiresIn: "30d" });
      return newAccessToken;
  } catch (error) {
      throw error;
  }
}

/**
* خروج کاربر و حذف `refreshToken`
*/
async function logoutUser(userId) {
  try {
      await db.query("UPDATE users SET refresh_token = NULL WHERE id = ?", [userId]);
      return true;
  } catch (error) {
      throw error;
  }
}


// 📌 پردازش داده‌های خام و تبدیل به فرمت استاندارد
function processRawData(rawData) {
  try {
    const parsedData = JSON.parse(rawData);

    if (parsedData.data && parsedData.meta) {
      return {
        data: parsedData.data,
        meta: parsedData.meta,
      };
    }

    return {
      data: parsedData,
      meta: {
        fetched_at: null,
        sources: null,
      },
    };
  } catch (error) {
    console.error("❌ Error processing raw data:", error);
    return null;
  }
}

// 📌 دریافت داده‌های امروز
async function getTodayData(today) {
  const [result] = await db.query(
    "SELECT data FROM gold_prices WHERE DATE(date) = ? ORDER BY date DESC LIMIT 1",
    [today]
  );

  if (result.length === 0) return null;
  return processRawData(result[0].data);
}

// 📌 دریافت کل داده‌های ذخیره‌شده (با `pagination`)
async function getAllData(limit = 100, offset = 0, startDate = null, endDate = null) {
  let query = `
      SELECT * FROM gold_prices 
      WHERE id IN (SELECT MIN(id) FROM gold_prices GROUP BY DATE(timestamp))
  `;

  let queryParams = [];

  if (startDate && endDate) {
      query += " AND DATE(timestamp) BETWEEN ? AND ?";
      queryParams.push(startDate, endDate);
  }

  query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  queryParams.push(limit, offset);

  const [result] = await db.query(query, queryParams);

  return result;
}

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
async function getDataInRange(start, end, limit, offset) {
  const countQuery = `
      SELECT COUNT(*) AS totalRecords FROM gold_prices 
      WHERE date BETWEEN ? AND ?
  `;
  const [[{ totalRecords }]] = await db.query(countQuery, [start, end]);

  const dataQuery = `
      SELECT data FROM gold_prices 
      WHERE date BETWEEN ? AND ?
      ORDER BY date ASC
      LIMIT ? OFFSET ?
  `;
  const [results] = await db.query(dataQuery, [start, end, limit, offset]);

  return {
    data: results.map((row) => processRawData(row.data)),
    totalRecords,
  };
}

// ✅ **متدهای مدیریت داده‌های ساعتی (`hourly_prices`)**

// 📌 ذخیره‌سازی داده‌های قیمتی ساعتی
async function storeHourlyPrices(mergedData, fetchId = null) {
  if (!mergedData?.data?.prices || !Array.isArray(mergedData.data.prices)) {
    console.error("❌ Invalid data format for storing hourly prices");
    return 0;
  }

  const prices = mergedData.data.prices;
  if (prices.length === 0) return 0;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const query = `
      INSERT INTO hourly_prices 
      (symbol, category, name, price, unit, timestamp, fetch_id)
      VALUES ?
      ON DUPLICATE KEY UPDATE 
      price = VALUES(price), 
      timestamp = VALUES(timestamp);
    `;

    const values = prices.map((price) => [
      price.symbol,
      price.category,
      price.name,
      price.price,
      price.unit || "IRR",
      new Date(),
      fetchId,
    ]);

    await connection.query(query, [values]);

    await connection.commit();
    console.log(`✅ Successfully stored ${prices.length} hourly price records`);
    return prices.length;
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error storing hourly prices:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// 📌 دریافت تاریخچه قیمت‌های ساعتی برای یک نماد
async function getHourlyPriceHistory(symbol, hours = 24) {
  try {
    const query = `
      SELECT symbol, price, unit, timestamp 
      FROM hourly_prices
      FORCE INDEX (idx_symbol_timestamp)
      WHERE symbol = ? 
      AND timestamp >= NOW() - INTERVAL ? HOUR
      ORDER BY timestamp DESC
      LIMIT 100;
    `;

    const [rows] = await db.query(query, [symbol, hours]);
    return rows;
  } catch (error) {
    console.error(`❌ Error fetching hourly history for ${symbol}:`, error);
    throw error;
  }
}

// 📌 حذف داده‌های قدیمی برای بهینه‌سازی پایگاه داده
async function cleanupOldHourlyData(daysToKeep = 365) {
  try {
    await db.query("CALL cleanup_old_hourly_data(?)", [daysToKeep]);
    console.log(`✅ Successfully cleaned up hourly data older than ${daysToKeep} days`);
  } catch (error) {
    console.error("❌ Error cleaning up old hourly data:", error);
    throw error;
  }
}

// 📌 دریافت داده‌های ساعتی در بازه زمانی مشخص
async function getAllHourlyData(options = {}) {
  try {
    let { startTime, endTime = new Date(), category = null, limit = 100, offset = 0 } = options;

    if (!isNaN(startTime)) {
      startTime = new Date(Date.now() - startTime * 60 * 60 * 1000);
    }

    let whereConditions = ["timestamp BETWEEN ? AND ?"];
    let queryParams = [startTime, endTime];

    if (category) {
      whereConditions.push("category = ?");
      queryParams.push(category);
    }

    const countQuery = `SELECT COUNT(*) as total FROM hourly_prices WHERE ${whereConditions.join(" AND ")}`;
    const dataQuery = `
      SELECT symbol, category, price, unit, timestamp
      FROM hourly_prices
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    const [[{ total }], data] = await Promise.all([
      db.query(countQuery, queryParams.slice(0, -2)),
      db.query(dataQuery, queryParams),
    ]);

    return { data, totalCount: total };
  } catch (error) {
    console.error(`❌ Error fetching all hourly data:`, error);
    throw error;
  }
}

// 📌 دریافت داده‌های ساعتی برای رسم نمودار
async function getChartData(options = {}) {
  try {
    const { symbols = [], hours = 24, interval = "hour" } = options;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error("At least one symbol must be provided");
    }

    const intervalMapping = {
      hour: "HOUR(timestamp)",
      "4hour": "FLOOR(HOUR(timestamp) / 4) * 4",
      day: "DATE(timestamp)",
    };

    const intervalKey = intervalMapping[interval] || intervalMapping["hour"];

    const query = `
      SELECT 
        symbol,
        ${intervalKey} as time_group,
        MIN(timestamp) as timestamp,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        FIRST_VALUE(price) OVER (PARTITION BY symbol, ${intervalKey} ORDER BY timestamp) as open_price,
        LAST_VALUE(price) OVER (PARTITION BY symbol, ${intervalKey} ORDER BY timestamp) as close_price
      FROM hourly_prices
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR) AND symbol IN (?)
      GROUP BY symbol, time_group
      ORDER BY symbol, timestamp
    `;

    const [rows] = await db.query(query, [hours, symbols]);

    return rows;
  } catch (error) {
    console.error(`❌ Error getting chart data:`, error);
    throw error;
  }
}

/**
 * 📌 دریافت لیست `symbols` از دیتابیس
 * @returns {Promise<Array>} - لیست سمبل‌های موجود در دیتابیس
 */
async function getSymbolsList() {
  try {
      const [rows] = await db.query(`
          SELECT DISTINCT symbol, category, name 
          FROM hourly_prices 
          ORDER BY category, symbol
      `);
      return rows;
  } catch (error) {
      console.error("❌ Error fetching symbols list:", error);
      throw error;
  }
}

/**
 * 📌 دریافت داده‌های روزانه برای یک `symbol`
 * @param {string} symbol - نام سمبل
 * @param {number} days - تعداد روزهای موردنظر
 * @returns {Promise<Array>} - آرایه‌ای از داده‌های روزانه
 */
async function getDailyDataForSymbol(symbol, days = 1) {
  try {
      const query = `
          SELECT 
              symbol, 
              category, 
              name, 
              AVG(price) AS avg_price, 
              MIN(price) AS min_price, 
              MAX(price) AS max_price, 
              DATE(timestamp) AS date
          FROM hourly_prices
          WHERE symbol = ? 
          AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY DATE(timestamp)
          ORDER BY date DESC;
      `;

      const [rows] = await db.query(query, [symbol, days]);
      return rows;
  } catch (error) {
      console.error(`❌ Error fetching daily data for ${symbol}:`, error);
      throw error;
  }
}

/**
 * 📌 دریافت لیست منابع داده‌ی فعال از دیتابیس
 * @returns {Promise<Array>} - لیست منابع داده
 */
async function getActiveDataSources() {
  try {
      const [sources] = await db.query(`
        SELECT ds.*, c.name as category_name 
        FROM data_sources ds
        JOIN categories c ON ds.category_id = c.id
        WHERE ds.active = 1
        ORDER BY ds.priority ASC;
      `);
      return sources;
  } catch (error) {
      console.error("❌ Error fetching active data sources:", error);
      throw error;
  }
}



module.exports = {
  getTodayData,
  getAllData,
  getDataInRange,
  storeHourlyPrices,
  getSymbolsList,
  getDailyDataForSymbol,
  getHourlyPriceHistory,
  cleanupOldHourlyData,
  getAllHourlyData,
  getChartData,
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getActiveDataSources
};