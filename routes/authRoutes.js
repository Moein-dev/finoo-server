require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const db = require("../config/db");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");

function generateRandomUsername() {
    return `user_${Math.floor(Math.random() * 1000000)}`;
}

// 🚀 محدود کردن درخواست‌های ثبت‌نام برای جلوگیری از Brute Force
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
    max: 5, // حداکثر ۵ درخواست در این بازه
    message: { status: "error", message: "Too many registration attempts, please try again later." }
});

// 📌 **ثبت‌نام کاربر جدید (بدون تولید توکن)**
router.post("/register", registerLimiter, async (req, res) => {
    let { username } = req.body;
    let existingUser = []; // مقداردهی اولیه

    if (!username) {
        do {
            username = generateRandomUsername();
            [existingUser] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
        } while (existingUser.length > 0); // بررسی عدم تکراری بودن نام کاربری
    }

    try {
        const [result] = await db.query("INSERT INTO users (username) VALUES (?)", [username]);
        return sendSuccessResponse(res, { username, message: "User registered successfully. Please log in to get a token." });
    } catch (err) {
        return sendErrorResponse(res, 500, err);
    }
});

// 📌 **ورود کاربر (Login)**
router.post("/login", async (req, res) => {
    const { username } = req.body;
    if (!username) return sendErrorResponse(res, 400, "Username is required");

    try {
        const [user] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
        if (user.length === 0) {
            return sendErrorResponse(res, 401, "Invalid username");
        }

        // ✅ تولید توکن در هنگام ورود
        const token = jwt.sign({ id: user[0].id, username }, process.env.SECRET_KEY, { expiresIn: "1h" });

        return sendSuccessResponse(res, { token });
    } catch (err) {
        return sendErrorResponse(res, 500, err);
    }
});

module.exports = router;
