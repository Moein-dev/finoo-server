const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const {
  getDataByDate,
  getDataInRange,
  searchPrices,
  getSymbols,
  getCategories,
  getPriceBySymbolAndDate,
} = require("../services/databaseService");
const router = express.Router();
// 📌 دریافت داده‌های امروز

// 📌 دریافت داده‌های امروز با نمایش آخرین زمان ذخیره
router.get("/prices", authenticateToken, async (req, res) => {
  try {
    let { date, page = 1, limit = 10, last_price = false } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    last_price = last_price === "true"; // تبدیل مقدار `string` به `boolean`

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // 📌 دریافت داده‌ها بر اساس پارامتر `last_price`
    const { data, totalRecords, requestedDate } = await getDataByDate(
      date,
      last_price,
      limit,
      offset
    );

    if (data.length === 0)
      return sendErrorResponse(res, 404, "هیچ داده ای برای تاریخ داده شده یافت نشد");

    const totalPages = Math.ceil(totalRecords / limit);

    return sendSuccessResponse(
      res,
      data,
      {
        self: `${req.protocol}://${req.get(
          "host"
        )}/api/data?date=${requestedDate}&last_price=${last_price}&page=${page}&limit=${limit}`,
      },
      {
        totalRecords,
        totalPages,
        currentPage: page,
        limitPerPage: limit,
        requestedDate,
        lastPriceMode: last_price,
      }
    );
  } catch (error) {
    console.error("❌ Error fetching data:", error);
    if (error.message === "Date cannot be in the future.") {
      return sendErrorResponse(
        res,
        400,
        "تاریخ نامعتبر است. شما نمی توانید داده های آینده را درخواست کنید."
      );
    }
    return sendErrorResponse(res, 500, "خطا در بازیابی داده ها.");
  }
});

router.get("/search", authenticateToken, async (req, res) => {
  try {
    let { symbol, category, page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // 📌 دریافت داده‌های فیلتر شده از `databaseService.js`
    const { data, totalRecords } = await searchPrices(
      symbol,
      category,
      page,
      limit
    );

    if (data.length === 0)
      return sendErrorResponse(res, 404, "هیچ داده ای برای فیلترهای داده شده یافت نشد");

    const totalPages = Math.ceil(totalRecords / limit);

    return sendSuccessResponse(
      res,
      data,
      {
        self: `${req.protocol}://${req.get("host")}/api/search?symbol=${
          symbol || ""
        }&category=${category || ""}&page=${page}&limit=${limit}`,
      },
      {
        totalRecords,
        totalPages,
        currentPage: page,
        limitPerPage: limit,
      }
    );
  } catch (error) {
    console.error("❌ Error fetching search results:", error);
    return sendErrorResponse(res, 500, "خطا در بازیابی نتایج جستجو.");
  }
});

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
router.get("/prices/range", authenticateToken, async (req, res) => {
  try {
    let { start_date, end_date, page = 1, limit = 10 } = req.query;

    if (!start_date || !end_date) {
      return sendErrorResponse(
        res,
        400,
        "هم تاریخ شروع و هم تاریخ پایان لازم است."
      );
    }

    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // ✅ دریافت داده‌ها از `databaseService.js`
    const { data, totalRecords, startDate, endDate, avgPrices } =
      await getDataInRange(start_date, end_date, limit, offset);

    if (data.length === 0)
      return sendErrorResponse(
        res,
        404,
        "هیچ داده ای برای محدوده تاریخ داده شده یافت نشد"
      );

    const totalPages = Math.ceil(totalRecords / limit);

    return sendSuccessResponse(
      res,
      { data, avgPrices },
      {
        self: `${req.protocol}://${req.get(
          "host"
        )}/api/prices/range?start_date=${startDate}&end_date=${endDate}&page=${page}&limit=${limit}`,
      },
      {
        totalRecords,
        totalPages,
        currentPage: page,
        limitPerPage: limit,
        startDate,
        endDate,
      }
    );
  } catch (error) {
    console.error("❌ Error fetching data range:", error);
    if (
      error.message ===
      "Invalid date range. The start date cannot be after the end date."
    ) {
      return sendErrorResponse(
        res,
        400,
        "محدوده تاریخ نامعتبر است. تاریخ شروع نمی تواند بعد از تاریخ پایان باشد."
      );
    }
    return sendErrorResponse(res, 500, "خطا در بازیابی محدوده داده.");
  }
});

router.get("/price", authenticateToken, async (req, res) => {
  const { symbol, date } = req.query;

  if (!symbol || !date) {
    return sendErrorResponse(res, 400, "نماد و تاریخ مورد نیاز است");
  }

  try {
    const price = await getPriceBySymbolAndDate(symbol, date);
    if (!price) {
      return sendErrorResponse(
        res,
        404,
        "هیچ داده ای برای نماد و تاریخ داده شده یافت نشد."
      );
    }
    return sendSuccessResponse(res, price);
  } catch (error) {
    console.error("❌ Error fetching price:", error.message);
    return sendErrorResponse(res, 500, "خطا در بازیابی اطلاعات قیمت.");
  }
});

router.get("/symbols", authenticateToken, async (req, res) => {
  try {
    const symbols = await getSymbols();
    return sendSuccessResponse(res, symbols);
  } catch (error) {
    console.error("❌ Error fetching symbols:", error);
    return sendErrorResponse(res, 500, "خطا در بازیابی نمادها.");
  }
});

router.get("/categories", authenticateToken, async (req, res) => {
  try {
    const categories = await getCategories();
    return sendSuccessResponse(res, categories);
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
    return sendErrorResponse(res, 500, "خطا در بازیابی دسته‌ها.");
  }
});

module.exports = router;
