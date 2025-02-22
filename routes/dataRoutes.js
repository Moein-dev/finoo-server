const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middlewares/authMiddleware");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const router = express.Router();

// 📌 دریافت داده‌های امروز
router.get("/data", authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [result] = await db.query("SELECT data FROM gold_prices WHERE DATE(date) = ? ORDER BY date DESC LIMIT 1", [today]);

    if (result.length === 0) return sendErrorResponse(res, 404, "No data found for today");

    let rawData = result[0].data;
    console.log("🔍 Fetched raw data from DB:", rawData);

    // بررسی فرمت داده و تبدیل به JSON
    if (typeof rawData !== "string") {
      console.warn("⚠️ Converting non-string data to JSON string...");
      rawData = JSON.stringify(rawData);
    }

    const parsedData = JSON.parse(rawData);
    console.log("✅ Successfully parsed data:", parsedData);

    return sendSuccessResponse(res, parsedData, {
      self: `${req.protocol}://${req.get("host")}/api/data`,
    }, { total: result.length });

  } catch (error) {
    console.error("❌ Error fetching or parsing data:", error);
    return sendErrorResponse(res, 500, "Error retrieving today's data.");
  }
});

// 📌 دریافت کل داده‌های ذخیره‌شده (هر روز فقط یک رکورد) با `pagination`
router.get("/all-data", authenticateToken, async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query; // مقدار پیش‌فرض: صفحه ۱، نمایش ۱۰ داده در هر صفحه
    page = parseInt(page);
    limit = parseInt(limit);
    
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    
    const offset = (page - 1) * limit;

    // ✅ دریافت تعداد کل رکوردها برای محاسبه صفحات
    const [[{ totalRecords }]] = await db.query(`
      SELECT COUNT(*) AS totalRecords FROM gold_prices 
      WHERE id IN (SELECT MIN(id) FROM gold_prices GROUP BY DATE(date))
    `);

    // ✅ دریافت داده‌های صفحه مورد نظر
    const query = `
      SELECT * FROM gold_prices 
      WHERE id IN (SELECT MIN(id) FROM gold_prices GROUP BY DATE(date))
      ORDER BY DATE(date) DESC
      LIMIT ? OFFSET ?`;

    const [result] = await db.query(query, [limit, offset]);

    if (result.length === 0) return sendErrorResponse(res, 404, "No data found");

    // ✅ محاسبه تعداد کل صفحات
    const totalPages = Math.ceil(totalRecords / limit);

    return sendSuccessResponse(res, result.map(row => JSON.parse(row.data)), {
      self: `${req.protocol}://${req.get("host")}/api/all-data?page=${page}&limit=${limit}`,
    }, {
      totalRecords,
      totalPages,
      currentPage: page,
      limitPerPage: limit,
    });

  } catch (error) {
    console.error("❌ Database error:", error);
    return sendErrorResponse(res, 500, "Error retrieving all data.");
  }
});

// 📌 دریافت داده‌های بین دو تاریخ
router.get("/data/range", authenticateToken, async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return sendErrorResponse(res, 400, "Start and end dates are required");

  try {
    const query = "SELECT * FROM gold_prices WHERE date BETWEEN ? AND ? ORDER BY date ASC";
    const [results] = await db.query(query, [start, end]);

    if (results.length === 0) return sendErrorResponse(res, 404, "No data found in the given range");

    return sendSuccessResponse(res, results.map(row => JSON.parse(row.data)), {
      self: `${req.protocol}://${req.get("host")}/api/data/range?start=${start}&end=${end}`,
    }, {
      total: results.length,
      page: 1,
      limit: results.length,
    });

  } catch (error) {
    console.error("❌ Error fetching range data:", error);
    return sendErrorResponse(res, 500, "Error retrieving data for the specified range.");
  }
});

module.exports = router;
