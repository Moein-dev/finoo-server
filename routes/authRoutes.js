const express = require("express");
const router = express.Router();
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const { registerUser, loginUser, refreshAccessToken, logoutUser } = require("../services/databaseService");

// 📌 **ثبت‌نام کاربر جدید**
router.post("/register", async (req, res) => {
    const { username } = req.body;

    if (!username) return sendErrorResponse(res, 400, "Username is required");

    try {
        const userId = await registerUser(username);
        return sendSuccessResponse(res, { userId, message: "User registered successfully. Please log in." });
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
});

// 📌 **ورود کاربر و دریافت توکن**
router.post("/login", async (req, res) => {
    const { username } = req.body;

    if (!username) return sendErrorResponse(res, 400, "Username is required");

    try {
        const tokens = await loginUser(username);
        return sendSuccessResponse(res, tokens);
    } catch (error) {
        return sendErrorResponse(res, 401, error.message);
    }
});

// 📌 **تمدید `accessToken` با استفاده از `refreshToken`**
router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) return sendErrorResponse(res, 400, "Refresh token is required");

    try {
        const newAccessToken = await refreshAccessToken(refreshToken);
        return sendSuccessResponse(res, { accessToken: newAccessToken });
    } catch (error) {
        return sendErrorResponse(res, 403, error.message);
    }
});

// 📌 **خروج کاربر و حذف `refreshToken`**
router.post("/logout", async (req, res) => {
    const { userId } = req.body;

    if (!userId) return sendErrorResponse(res, 400, "User ID is required");

    try {
        await logoutUser(userId);
        return sendSuccessResponse(res, { message: "User logged out successfully" });
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
});

module.exports = router;