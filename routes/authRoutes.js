require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const db = require("../config/db");
const router = express.Router();
const rateLimit = require("express-rate-limit");

function generateRandomUsername() {
    return `user_${Math.floor(Math.random() * 1000000)}`;
}

// 🚀 محدود کردن درخواست‌های ثبت‌نام برای جلوگیری از Brute Force
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
    max: 5, // حداکثر ۵ درخواست در این بازه
    message: { status: "error", message: "Too many registration attempts, please try again later." }
});

// 📌 **ثبت‌نام کاربر جدید**
router.post("/register", registerLimiter, async (req, res) => {
    let { username } = req.body;
    
    let existingUser;
    if (!username) {
        do {
            username = generateRandomUsername();
            [existingUser] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
        } while (existingUser.length > 0); // بررسی عدم تکراری بودن نام کاربری
    }

    if (!process.env.SECRET_KEY) {
        return res.status(500).json({ status: "error", message: "Server misconfiguration: SECRET_KEY is missing." });
    }

    let userId;
    try {
        // ✅ ذخیره کاربر در دیتابیس
        const [result] = await db.query("INSERT INTO users (username) VALUES (?)", [username]);
        userId = result.insertId;
    } catch (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ status: "error", message: "Database error", error: err.message });
    }

    let token;
    try {
        token = jwt.sign({ id: userId, username }, process.env.SECRET_KEY, { expiresIn: "1h" });
    } catch (err) {
        // ❌ در صورت بروز خطا، کاربر را از دیتابیس حذف کن (ثبت ناقص نشود)
        await db.query("DELETE FROM users WHERE id = ?", [userId]);
        return res.status(500).json({ status: "error", message: "Error generating token.", error: err.message });
    }

    res.json({ status: "success", username, token });
});


// 📌 **ورود کاربر (Login)**
router.post("/login", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ status: "error", message: "Username is required" });

    try {
        const [user] = await db.query("SELECT id FROM users WHERE username = ?", [username]);

        if (user.length === 0) {
            return res.status(401).json({ status: "error", message: "Invalid username" });
        }

        // ✅ تولید توکن جدید
        const token = jwt.sign({ id: user[0].id, username }, process.env.SECRET_KEY, { expiresIn: "1h" });

        res.json({ status: "success", token });
    } catch (err) {
        console.error("❌ Database error:", err);
        res.status(500).json({ status: "error", message: "Database error", error: err.message });
    }
});

module.exports = router;
