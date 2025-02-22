require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const db = require("../config/db");
const router = express.Router();
const rateLimit = require("express-rate-limit");

function generateRandomUsername() {
    return `user_${Math.floor(Math.random() * 1000000)}`;
}

// 🚀 محدود کردن درخواست‌های ثبت نام برای جلوگیری از Brute Force
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
    max: 5, // حداکثر ۵ درخواست در این بازه
    message: { status: "error", message: "Too many registration attempts, please try again later." }
});

router.post("/register", registerLimiter, async (req, res) => {
    let { username } = req.body;
    if (!username) {
        username = generateRandomUsername();
    }

    // بررسی مقدار `SECRET_KEY`
    if (!process.env.SECRET_KEY) {
        return res.status(500).json({ status: "error", message: "Server misconfiguration: SECRET_KEY is missing." });
    }

    let token;
    try {
        token = jwt.sign({ username }, process.env.SECRET_KEY, { expiresIn: "1h" });
    } catch (err) {
        return res.status(500).json({ status: "error", message: "Error generating token.", error: err.message });
    }

    try {
        const [result] = await db.query("INSERT INTO users (username) VALUES (?)", [username]);
        res.json({ status: "success", username, token });
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).json({ status: "error", message: "Database error", error: err.message });
    }
});

module.exports = router;
