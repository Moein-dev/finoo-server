const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middlewares/authMiddleware");
const router = express.Router();

function sendSuccessResponse(res, data, links = null, meta = null) {
  const response = { status: 200, data, links, meta };
  if (!links || Object.keys(links).length === 0) delete response.links;
  if (!meta || Object.keys(meta).length === 0) delete response.meta;
  return res.status(200).json(response);
}

function sendErrorResponse(res, statusCode, error) {
  console.error(`❌ Error ${statusCode}:`, error);
  return res.status(statusCode).json({ status: statusCode, error: error.message || error });
}

// 📌 دریافت داده‌های امروز
router.get("/data", authenticateToken, (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  db.query("SELECT * FROM gold_prices WHERE DATE(date) = ? ORDER BY date DESC", [today], (err, result) => {
      if (err) return sendErrorResponse(res, 500, "Database error");

      if (result.length === 0) return sendErrorResponse(res, 404, "No data found for today");

      try {
          let rawData = result[0]?.data;
          console.log("🔍 Fetched raw data from DB:", rawData);

          // بررسی می‌کنیم که مقدار `data` یک `string` باشد
          if (!rawData || typeof rawData !== "string") {
              console.error("❌ Invalid data format in database:", rawData);
              return sendErrorResponse(res, 500, "Invalid data format in database");
          }

          const parsedData = JSON.parse(rawData);
          console.log("✅ Successfully parsed data:", parsedData);

          sendSuccessResponse(res, parsedData, {
              self: `${req.protocol}://${req.get("host")}/api/data`,
          }, { total: result.length });

      } catch (error) {
          console.error("❌ Error parsing JSON data:", error);
          return sendErrorResponse(res, 500, "Error parsing JSON data");
      }
  });
});




// 📌 دریافت کل داده‌های ذخیره‌شده
router.get("/all-data",authenticateToken, (req, res) => {
  db.query("SELECT * FROM gold_prices ORDER BY date DESC", (err, result) => {
    if (err) return sendErrorResponse(res, 500, "Database error");
    if (result.length === 0)
      return sendErrorResponse(res, 404, "No data found");

    // آماده‌سازی لینک‌ها و متا (اختیاری)
    const links = {
      self: `${req.protocol}://${req.get("host")}/api/all-data`,
    };
    const meta = {
      total: result.length,
      page: 1,
      limit: result.length,
    };

    // ارسال پاسخ موفق
    sendSuccessResponse(res, result.map(row => JSON.parse(row.data)), links, meta);
  });
});

// 📌 دریافت داده‌های بین دو تاریخ
router.get("/data/range",authenticateToken, (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return sendErrorResponse(res, 400, "Start and end dates are required");

  const query = "SELECT * FROM gold_prices WHERE date BETWEEN ? AND ? ORDER BY date ASC";
  db.query(query, [start, end], (err, results) => {
    if (err) return sendErrorResponse(res, 500, "Internal Server Error");

    // آماده‌سازی لینک‌ها و متا (اختیاری)
    const links = {
      self: `${req.protocol}://${req.get("host")}/api/data/range?start=${start}&end=${end}`,
    };
    const meta = {
      total: results.length,
      page: 1,
      limit: results.length,
    };

    // ارسال پاسخ موفق
    sendSuccessResponse(res, results.map(row => JSON.parse(row.data)), links, meta);
  });
});

module.exports = router;