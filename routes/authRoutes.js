const express = require("express");
const router = express.Router();
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const { registerUser, loginUser, refreshAccessToken, logoutUser } = require("../services/databaseService");
const { body, validationResult } = require('express-validator');

// 📌 **ثبت‌نام کاربر جدید**
router.post("/register", [
    body('username').notEmpty().withMessage('Username is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    const { username } = req.body;

    try {
        const userId = await registerUser(username);
        return sendSuccessResponse(res, { userId, message: "User registered successfully. Please log in." });
    } catch (error) {
        return sendErrorResponse(res, 500, 'An error occurred during registration.');
    }
});

// 📌 **ورود کاربر و دریافت توکن**
router.post("/login", [
    body('username').notEmpty().withMessage('Username is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    const { username } = req.body;

    try {
        const tokens = await loginUser(username);
        return sendSuccessResponse(res, tokens);
    } catch (error) {
        return sendErrorResponse(res, 401, 'Invalid login credentials.');
    }
});

// 📌 **تمدید `accessToken` با استفاده از `refreshToken`**
router.post("/refresh", [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    const { refreshToken } = req.body;

    try {
        const newAccessToken = await refreshAccessToken(refreshToken);
        return sendSuccessResponse(res, { accessToken: newAccessToken });
    } catch (error) {
        return sendErrorResponse(res, 403, 'Failed to refresh access token.');
    }
});

// 📌 **خروج کاربر و حذف `refreshToken`**
router.post("/logout", [
    body('userId').notEmpty().withMessage('User ID is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    const { userId } = req.body;

    try {
        await logoutUser(userId);
        return sendSuccessResponse(res, { message: "User logged out successfully" });
    } catch (error) {
        return sendErrorResponse(res, 500, 'An error occurred during logout.');
    }
});

module.exports = router;