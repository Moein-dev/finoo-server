const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware").default;
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const { getTodayData, getAllData, getDataInRange } = require("../services/databaseService").default;
const router = express.Router();

// 📌 دریافت داده‌های امروز
router.get("/data", authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];
        const data = await getTodayData(today);

        if (!data) return sendErrorResponse(res, 404, "No data found for today");

        return sendSuccessResponse(res, data, {
            self: `${req.protocol}://${req.get("host")}/api/data`,
        });

    } catch (error) {
        console.error("❌ Error fetching data:", error);
        return sendErrorResponse(res, 500, "Error retrieving today's data.");
    }
});

// 📌 دریافت کل داده‌های ذخیره‌شده (با `pagination`)
router.get("/all-data", authenticateToken, async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;

        // ✅ دریافت داده‌ها از `databaseService.js`
        const { data, totalRecords } = await getAllData(limit, offset);

        if (data.length === 0) return sendErrorResponse(res, 404, "No data found");

        const totalPages = Math.ceil(totalRecords / limit);

        return sendSuccessResponse(res, data, {
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

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
router.get("/data/range", authenticateToken, async (req, res) => {
    try {
        let { start, end, page = 1, limit = 10 } = req.query;
        if (!start || !end) return sendErrorResponse(res, 400, "Start and end dates are required");

        page = parseInt(page);
        limit = parseInt(limit);
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;

        // ✅ دریافت داده‌ها از `databaseService.js`
        const { data, totalRecords } = await getDataInRange(start, end, limit, offset);

        if (data.length === 0) return sendErrorResponse(res, 404, "No data found in the given range");

        const totalPages = Math.ceil(totalRecords / limit);

        return sendSuccessResponse(res, data, {
            self: `${req.protocol}://${req.get("host")}/api/data/range?start=${start}&end=${end}&page=${page}&limit=${limit}`,
        }, {
            totalRecords,
            totalPages,
            currentPage: page,
            limitPerPage: limit,
        });

    } catch (error) {
        console.error("❌ Error fetching range data:", error);
        return sendErrorResponse(res, 500, "Error retrieving data for the specified range.");
    }
});

module.exports = router;
