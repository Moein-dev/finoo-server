const express = require("express");
const db = require("../config/db");

const router = express.Router();

// 📌 دریافت داده‌های امروز
router.get("/data", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  db.query("SELECT * FROM gold_prices WHERE DATE(date) = ? ORDER BY date DESC", [today], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.length === 0) return res.status(404).json({ error: "No data found for today" });
    res.json(result);
  });
});

// 📌 دریافت کل داده‌های ذخیره‌شده
router.get("/all-data", (req, res) => {
  db.query("SELECT * FROM gold_prices ORDER BY date DESC", (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.length === 0) return res.status(404).json({ error: "No data found" });
    res.json(result);
  });
});

// 📌 دریافت داده‌های بین دو تاریخ
router.get("/data/range", (req, res) => {
  const { start, end } = req.query;
  const query = "SELECT * FROM gold_prices WHERE date BETWEEN ? AND ? ORDER BY date ASC";
  db.query(query, [start, end], (err, results) => {
    if (err) return res.status(500).json({ error: "Internal Server Error" });
    res.json(results);
  });
});

module.exports = router;
