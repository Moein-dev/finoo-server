const express = require("express");
const db = require("../config/db");
const router = express.Router();

// تابع برای ارسال پاسخ موفق
function sendSuccessResponse(res, data, links = null, meta = null) {
  const response = {
    status: 200,
    data,
    links,
    meta,
  };

  // حذف links و meta اگر خالی باشند
  if (!links || Object.keys(links).length === 0) delete response.links;
  if (!meta || Object.keys(meta).length === 0) delete response.meta;

  return res.status(200).json(response);
}

// تابع برای ارسال پاسخ ناموفق
function sendErrorResponse(res, statusCode, error) {
  return res.status(statusCode).json({
    status: statusCode,
    error,
  });
}

// 📌 دریافت داده‌های امروز
router.get("/data", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  db.query("SELECT * FROM gold_prices WHERE DATE(date) = ? ORDER BY date DESC", [today], (err, result) => {
    if (err) return sendErrorResponse(res, 500, "Database error");
    if (result.length === 0)
      return sendErrorResponse(res, 404, "No data found for today");

    // آماده‌سازی لینک‌ها و متا (اختیاری)
    const links = {
      self: `${req.protocol}://${req.get("host")}/api/data`,
    };
    const meta = {
      total: result.length,
      page: 1,
      limit: result.length,
    };

    // ارسال پاسخ موفق
    sendSuccessResponse(res, result[0].data, links, meta);
  });
});

// 📌 دریافت کل داده‌های ذخیره‌شده
router.get("/all-data", (req, res) => {
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
router.get("/data/range", (req, res) => {
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