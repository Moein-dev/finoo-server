const db = require("../config/db");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

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
      logger.error('Error in registerUser:', { error: error.message });
      throw new Error('An error occurred during user registration.');
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
      const refreshToken = jwt.sign({ id: userId }, process.env.REFRESH_SECRET_KEY, { expiresIn: "60d" });

      await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, userId]);

      return { accessToken, refreshToken };
  } catch (error) {
      console.error('Error in loginUser:', error);
      throw new Error('An error occurred during user login.');
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

      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);
      const [user] = await db.query("SELECT id FROM users WHERE id = ? AND refresh_token = ?", [decoded.id, refreshToken]);

      if (!user.length) {
          throw new Error("Invalid refresh token");
      }

      const newAccessToken = jwt.sign({ id: user[0].id }, process.env.SECRET_KEY, { expiresIn: "30d" });
      return newAccessToken;
  } catch (error) {
      console.error('Error in refreshAccessToken:', error);
      throw new Error('An error occurred while refreshing access token.');
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
      console.error('Error in logoutUser:', error);
      throw new Error('An error occurred during user logout.');
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
  try {
    const query = `
      SELECT 
        s.name as symbol,
        c.name as category,
        p.price,
        s.unit,
        p.change_percent,
        p.created_at as timestamp,
        ds.name as source_name
      FROM prices p
      JOIN symbols s ON p.symbol_id = s.id
      JOIN categories c ON s.category_id = c.id
      JOIN data_sources ds ON p.data_source_id = ds.id
      WHERE DATE(p.created_at) = ?
      ORDER BY p.created_at DESC
      LIMIT 1;
    `;

    const [rows] = await db.query(query, [today]);
    if (rows.length === 0) return null;

    return {
      data: rows.reduce((acc, row) => {
        if (!acc[row.category]) {
          acc[row.category] = [];
        }
        acc[row.category].push({
          symbol: row.symbol,
          price: row.price,
          change_percent: row.change_percent,
          unit: row.unit
        });
        return acc;
      }, {}),
      meta: {
        fetched_at: rows[0]?.timestamp,
        source_name: rows[0]?.source_name
      }
    };
  } catch (error) {
    console.error("❌ Error fetching today's data:", error);
    return null;
  }
}

// 📌 دریافت کل داده‌های ذخیره‌شده (با `pagination`)
async function getAllData(limit = 100, offset = 0, startDate = null, endDate = null) {
  try {
    let query = `
      SELECT 
        s.name as symbol,
        c.name as category,
        p.price,
        s.unit,
        p.change_percent,
        p.created_at as timestamp,
        ds.name as source_name
      FROM prices p
      JOIN symbols s ON p.symbol_id = s.id
      JOIN categories c ON s.category_id = c.id
      JOIN data_sources ds ON p.data_source_id = ds.id
      WHERE p.id IN (
        SELECT MIN(id) 
        FROM prices 
        GROUP BY DATE(created_at), symbol_id
      )
    `;

    let queryParams = [];

    if (startDate && endDate) {
      query += " AND DATE(p.created_at) BETWEEN ? AND ?";
      queryParams.push(startDate, endDate);
    }

    query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    const [rows] = await db.query(query, queryParams);

    return rows.map(row => ({
      symbol: row.symbol,
      category: row.category,
      price: row.price,
      unit: row.unit,
      change_percent: row.change_percent,
      timestamp: row.timestamp,
      source_name: row.source_name
    }));
  } catch (error) {
    console.error("❌ Error fetching all data:", error);
    throw error;
  }
}

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
async function getDataInRange(start, end, limit, offset) {
  try {
    const countQuery = `
      SELECT COUNT(DISTINCT DATE(p.created_at)) AS totalRecords 
      FROM prices p
      WHERE p.created_at BETWEEN ? AND ?
    `;
    const [[{ totalRecords }]] = await db.query(countQuery, [start, end]);

    const dataQuery = `
      SELECT 
        s.name as symbol,
        c.name as category,
        p.price,
        s.unit,
        p.change_percent,
        p.created_at as timestamp,
        ds.name as source_name
      FROM prices p
      JOIN symbols s ON p.symbol_id = s.id
      JOIN categories c ON s.category_id = c.id
      JOIN data_sources ds ON p.data_source_id = ds.id
      WHERE p.created_at BETWEEN ? AND ?
      ORDER BY p.created_at ASC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(dataQuery, [start, end, limit, offset]);

    return {
      data: rows.map(row => ({
        symbol: row.symbol,
        category: row.category,
        price: row.price,
        unit: row.unit,
        change_percent: row.change_percent,
        timestamp: row.timestamp,
        source_name: row.source_name
      })),
      totalRecords
    };
  } catch (error) {
    console.error("❌ Error fetching data in range:", error);
    throw error;
  }
}

async function getCategoriesMap() {
  try {
    const [rows] = await db.query("SELECT id, name FROM categories");
    return rows.reduce((acc, row) => {
      acc[row.name] = row.id;
      return acc;
    }, {});
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return {};
  }
}

// 📌 ذخیره‌سازی داده‌های قیمتی ساعتی
async function storeHourlyPrices(mergedData, fetchId = null) {
  if (!mergedData?.data || typeof mergedData.data !== "object") {
    console.error("❌ Invalid data format for storing hourly prices", mergedData);
    return 0;
  }

  let prices = [];

  // Get symbol and data source mappings
  const [symbols] = await db.query("SELECT id, name FROM symbols WHERE active = 1");
  const [dataSources] = await db.query("SELECT id, name FROM data_sources WHERE active = 1");
  
  const symbolMap = symbols.reduce((acc, row) => {
    acc[row.name] = row.id;
    return acc;
  }, {});

  const sourceMap = dataSources.reduce((acc, row) => {
    acc[row.name] = row.id;
    return acc;
  }, {});

  // Process different categories
  for (const [category, items] of Object.entries(mergedData.data)) {
    if (Array.isArray(items)) {
      items.forEach((item) => {
        const symbolId = symbolMap[item.symbol];
        const sourceId = sourceMap[mergedData.meta.source_name];

        if (symbolId && sourceId) {
          const priceEntry = new PriceModel({
            symbol_id: symbolId,
            data_source_id: sourceId,
            price: item.price,
            change_percent: item.change_percent,
            fetch_id: fetchId
          });

          if (PriceModel.validate(priceEntry)) {
            prices.push(priceEntry.toDBFormat());
          }
        }
      });
    }
  }

  if (prices.length === 0) return 0;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const query = `
      INSERT INTO prices 
      (symbol_id, price, change_percent, data_source_id, fetch_id, created_at)
      VALUES ?
    `;

    await connection.query(query, [prices]);

    await connection.commit();
    console.log(`✅ Successfully stored ${prices.length} price records`);
    return prices.length;
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error storing prices:", error);
    throw error;
  } finally {
    connection.release();
  }
}
// 📌 دریافت تاریخچه قیمت‌های ساعتی برای یک نماد
async function getHourlyPriceHistory(symbol, hours = 24) {
  try {
    const query = `
      SELECT 
        s.name as symbol,
        p.price,
        s.unit,
        p.created_at as timestamp
      FROM prices p
      JOIN symbols s ON p.symbol_id = s.id
      WHERE s.name = ? 
      AND p.created_at >= NOW() - INTERVAL ? HOUR
      ORDER BY p.created_at DESC
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
    const [result] = await db.query("CALL sp_cleanup_old_prices(?, @deleted_count)", [daysToKeep]);
    const [[{ deleted_count }]] = await db.query("SELECT @deleted_count as deleted_count");
    console.log(`✅ Successfully cleaned up ${deleted_count} records older than ${daysToKeep} days`);
    return deleted_count;
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

    let whereConditions = ["p.created_at BETWEEN ? AND ?"];
    let queryParams = [startTime, endTime];

    if (category) {
      whereConditions.push("c.name = ?");
      queryParams.push(category);
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM prices p
      JOIN symbols s ON p.symbol_id = s.id
      JOIN categories c ON s.category_id = c.id
      WHERE ${whereConditions.join(" AND ")}
    `;

    const dataQuery = `
      SELECT 
        s.name as symbol,
        c.name as category,
        p.price,
        s.unit,
        p.created_at as timestamp
      FROM prices p
      JOIN symbols s ON p.symbol_id = s.id
      JOIN categories c ON s.category_id = c.id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY p.created_at DESC
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
      hour: "HOUR(p.created_at)",
      "4hour": "FLOOR(HOUR(p.created_at) / 4) * 4",
      day: "DATE(p.created_at)",
    };

    const intervalKey = intervalMapping[interval] || intervalMapping["hour"];

    const query = `
      SELECT 
        s.name as symbol,
        ${intervalKey} as time_group,
        MIN(p.created_at) as timestamp,
        AVG(p.price) as avg_price,
        MIN(p.price) as min_price,
        MAX(p.price) as max_price,
        FIRST_VALUE(p.price) OVER (PARTITION BY s.name, ${intervalKey} ORDER BY p.created_at) as open_price,
        LAST_VALUE(p.price) OVER (PARTITION BY s.name, ${intervalKey} ORDER BY p.created_at) as close_price
      FROM prices p
      JOIN symbols s ON p.symbol_id = s.id
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR) 
      AND s.name IN (?)
      GROUP BY s.name, time_group
      ORDER BY s.name, timestamp
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
          SELECT ds.id, ds.name AS symbol, ds.url, ds.type, ds.active, ds.priority, 
                 c.id AS category_id, c.name AS category_name
          FROM data_sources ds
          LEFT JOIN categories c ON ds.category_id = c.id
          WHERE ds.active = 1
          ORDER BY ds.priority ASC;
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
              category_name,
              display_name,
              open_price,
              close_price,
              high_price,
              low_price,
              price_date
          FROM v_daily_summary
          WHERE symbol = ? 
          AND price_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
          ORDER BY price_date DESC;
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
          SELECT ds.*
          FROM data_sources ds
          WHERE ds.active = 1
          ORDER BY ds.priority ASC;
      `);
      return sources;
  } catch (error) {
      console.error("❌ Error fetching active data sources:", error);
      throw error;
  }
}

/**
 * 📌 دریافت آخرین قیمت ثبت شده برای یک `symbol`
 * @param {string} symbol - نام سمبل
 * @returns {Promise<Object|null>}
 */
async function getLatestPrice(symbol) {
  if (!symbol) {
      console.error("❌ Error: getLatestPrice called with undefined symbol");
      return null;
  }

  try {
      const query = `
          SELECT symbol, display_name, category_name, price, change_percent, unit, price_time, source_name
          FROM v_latest_prices
          WHERE symbol = ?;
      `;
      const [rows] = await db.query(query, [symbol]);

      return rows.length > 0 ? rows[0] : null;
  } catch (error) {
      console.error(`❌ Error fetching latest price for ${symbol}:`, error);
      throw error;
  }
}

/**
 * 📌 دریافت خلاصه وضعیت هر دسته‌بندی
 * @returns {Promise<Array>} - آرایه‌ای از خلاصه وضعیت دسته‌بندی‌ها
 */
async function getCategorySummary() {
  try {
      const query = `
          SELECT 
              category_name,
              total_symbols,
              total_updates,
              earliest_update,
              latest_update
          FROM v_category_summary
          ORDER BY category_name;
      `;
      const [rows] = await db.query(query);
      return rows;
  } catch (error) {
      console.error("❌ Error fetching category summary:", error);
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
  getActiveDataSources,
  getLatestPrice,
  getCategorySummary
};