const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const { getTodayData, getAllData, getDataInRange } = require("../services/databaseService");
const router = express.Router();

// 📌 Default data format options
const DEFAULT_DATA_FORMAT = 'categorized'; // 'categorized' or 'flat'

// Helper function to format response based on format parameter
function formatResponse(data, format = DEFAULT_DATA_FORMAT) {
  if (!data || !data.data) return data;
  
  // Return the data in the requested format
  if (format === 'flat' && data.data.prices) {
    // Return only the flat array of prices
    return {
      data: data.data.prices,
      meta: data.meta
    };
  } else if (format === 'categorized' && data.data.categories) {
    // Return the categorized data structure
    return {
      data: data.data.categories,
      meta: data.meta
    };
  }
  
  // Default: return the full data structure
  return data;
}

// 📌 دریافت داده‌های امروز
router.get("/data", authenticateToken, async (req, res) => {
    try {
        const { format = DEFAULT_DATA_FORMAT } = req.query;
        const today = new Date().toISOString().split("T")[0];
        const data = await getTodayData(today);

        if (!data) return sendErrorResponse(res, 404, "No data found for today");

        // Format the response based on the requested format
        const formattedData = formatResponse(data, format);

        return sendSuccessResponse(res, formattedData.data, {
            self: `${req.protocol}://${req.get("host")}/api/data?format=${format}`,
        }, formattedData.meta);

    } catch (error) {
        console.error("❌ Error fetching data:", error);
        return sendErrorResponse(res, 500, "Error retrieving today's data.");
    }
});

// 📌 دریافت کل داده‌های ذخیره‌شده (با `pagination`)
router.get("/all-data", authenticateToken, async (req, res) => {
    try {
        let { page = 1, limit = 10, format = DEFAULT_DATA_FORMAT } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;
        const { data, totalRecords } = await getAllData(limit, offset);

        if (data.length === 0) return sendErrorResponse(res, 404, "No data found");

        // Format each data entry based on the requested format
        const formattedData = data.map(entry => formatResponse(entry, format));
        const totalPages = Math.ceil(totalRecords / limit);

        return sendSuccessResponse(res, formattedData, {
            self: `${req.protocol}://${req.get("host")}/api/all-data?page=${page}&limit=${limit}&format=${format}`,
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
        let { start, end, page = 1, limit = 10, format = DEFAULT_DATA_FORMAT } = req.query;
        if (!start || !end) return sendErrorResponse(res, 400, "Start and end dates are required");

        page = parseInt(page);
        limit = parseInt(limit);
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;
        const { data, totalRecords } = await getDataInRange(start, end, limit, offset);

        if (data.length === 0) return sendErrorResponse(res, 404, "No data found in the given range");

        // Format each data entry based on the requested format
        const formattedData = data.map(entry => formatResponse(entry, format));
        const totalPages = Math.ceil(totalRecords / limit);

        return sendSuccessResponse(res, formattedData, {
            self: `${req.protocol}://${req.get("host")}/api/data/range?start=${start}&end=${end}&page=${page}&limit=${limit}&format=${format}`,
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
