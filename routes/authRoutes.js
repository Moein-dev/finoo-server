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
    windowMs: 1 * 60 * 1000, // 1 دقیقه
    max: 20, // حداکثر ۵ درخواست در این بازه
    message: { status: "error", message: "Too many registration attempts, please try again later." }
});

// 📌 **ثبت‌نام کاربر جدید (بدون تولید توکن)**
router.post("/register", registerLimiter, async (req, res) => {
    let { username } = req.body;
    let existingUser = [];

    if (!username) {
        do {
            username = generateRandomUsername();
            [existingUser] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
        } while (existingUser.length > 0);
    }

    try {
        const [result] = await db.query("INSERT INTO users (username) VALUES (?)", [username]);
        return sendSuccessResponse(res, { username, message: "User registered successfully. Please log in to get a token." });
    } catch (err) {
        return sendErrorResponse(res, 500, err);
    }
});

// 📌 **ورود کاربر (Login) و تولید `accessToken` + `refreshToken`**
router.post("/login", async (req, res) => {
    const { username } = req.body;
    if (!username || username.trim() === "") return sendErrorResponse(res, 400, "Username is required");

    try {
        // 📌 دریافت اطلاعات کاربر از دیتابیس
        const [user] = await db.query("SELECT id, username, email, name, image, role FROM users WHERE username = ?", [username]);

        // **بررسی اینکه کاربر در دیتابیس وجود دارد یا نه**
        if (!user || user.length === 0) {
            return sendErrorResponse(res, 401, "Invalid username");
        }

        const userData = user[0]; // مقداردهی امن
        const userId = userData.id;

        // ✅ تولید `accessToken` و `refreshToken`
        const accessToken = jwt.sign({ id: userId, username: userData.username, role: userData.role }, process.env.SECRET_KEY, { expiresIn: "30d" });
        const refreshToken = jwt.sign({ id: userId, username: userData.username }, process.env.REFRESH_SECRET_KEY, { expiresIn: "60d" });

        // ✅ ذخیره `refreshToken` در دیتابیس
        await db.query("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, userId]);

        // ✅ **ارسال داده‌های کاربر**
        return sendSuccessResponse(res, {
            profile: {
                username: userData.username,
                email: userData.email || null,
                name: userData.name || null,
                image: userData.image || null
            },
            authentication: {
                access_token: accessToken,
                refresh_token: refreshToken
            }
        });

    } catch (err) {
        return sendErrorResponse(res, 500, err);
    }
});


// 📌 **تمدید توکن با استفاده از `refreshToken`**
router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendErrorResponse(res, 400, "Refresh token is required");

    try {
        // ✅ بررسی صحت `refreshToken`
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);
        const [user] = await db.query("SELECT id FROM users WHERE id = ? AND refresh_token = ?", [decoded.id, refreshToken]);

        if (user.length === 0) {
            return sendErrorResponse(res, 403, "Invalid refresh token");
        }

        // ✅ تولید `accessToken` جدید
        const newAccessToken = jwt.sign({ id: decoded.id, username: decoded.username }, process.env.SECRET_KEY, { expiresIn: "30d" });

        return sendSuccessResponse(res, { accessToken: newAccessToken });
    } catch (err) {
        return sendErrorResponse(res, 403, "Invalid or expired refresh token");
    }
});

// 📌 **خروج از حساب و حذف `refreshToken`**
router.post("/logout", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendErrorResponse(res, 400, "Refresh token is required");

    try {
        // ✅ حذف `refreshToken` از دیتابیس
        await db.query("UPDATE users SET refresh_token = NULL WHERE refresh_token = ?", [refreshToken]);
        return sendSuccessResponse(res, { message: "Logged out successfully" });
    } catch (err) {
        return sendErrorResponse(res, 500, err);
    }
});

module.exports = router;
