const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const databaseService = require("../services/databaseService");
const PriceModel = require("../models/priceModel"); // Fixed casing to match actual file
const logger = require("../utils/logger");
// منابع داده و وضعیت اولیه
let dataSources = [];
let isInitialized = false;

/**
 * 📌 **بارگذاری منابع داده از دیتابیس**
 */
async function initialize() {
  if (isInitialized) {
    logger.warn("⚠️ Data fetch service is already initialized.");
    return;
  }

  try {
    dataSources = await databaseService.getActiveDataSources();
    isInitialized = true;
    logger.info(`✅ Data fetch service initialized with ${dataSources.length} sources`);

    if (dataSources.length < 3) {
      logger.warn("⚠️ Warning: Less than 3 active data sources available.");
    }
  } catch (error) {
    logger.error("❌ Error initializing data fetch service:", { error: error.message });
    throw new Error('Failed to initialize data fetch service.');
  }
}

/**
 * 📌 **تنظیم `cron job` برای دریافت خودکار داده‌ها**
 */
function setupScheduledFetching() {
  const cron = require("node-cron");

  // اجرای درخواست هر ساعت
  cron.schedule("0 * * * *", async () => {
    logger.info("🔄 Running hourly data fetch...");
    try {
      await fetchDataWithTracking("hourly");
    } catch (error) {
      logger.error("❌ Scheduled fetch failed:", error);
    }
  });

  logger.info("✅ Scheduled data fetching set up");
}

/**
 * 📌 **دریافت داده‌ها از همه منابع با `fetch_id` اختصاصی**
 * @param {string} triggerType - نوع اجرا (`hourly`, `manual`, ...)
 * @returns {Promise<Object>} - نتیجه دریافت داده‌ها
 */
async function fetchDataWithTracking(triggerType = "manual") {
  if (!isInitialized) {
    throw new Error("❌ Data fetch service not initialized. Run `initialize()` first.");
  }

  const startTime = Date.now();
  const fetchId = uuidv4();
  let recordsStored = 0;

  try {
    // دریافت داده از تمام منابع فعال
    const fetchPromises = dataSources.map((source) => fetchFromSource(source));
    const results = await Promise.allSettled(fetchPromises);

    // ✅ فیلتر منابع موفق
    const successResults = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value);

    const failedSources = results.filter((r) => r.status === "rejected");
    
    // **❌ اگر بیش از ۵۰٪ منابع ناموفق باشند، ذخیره‌سازی انجام نشود**
    if (failedSources.length / results.length > 0.5) {
      logger.error("🚨 More than 50% of sources failed. Skipping database update.");
      return {
        success: false,
        fetchId,
        error: "More than 50% of sources failed",
        duration: Date.now() - startTime,
      };
    }

    if (successResults.length > 0) {
      // **✅ اصلاح نام متد `storeHourlyPrices` ✅**
      recordsStored = await databaseService.storeHourlyPrices(successResults, fetchId);
    }

    return {
      success: recordsStored > 0,
      fetchId,
      recordsStored,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    logger.error("❌ Error in fetchDataWithTracking:", error);
    return {
      success: false,
      fetchId,
      error: 'An error occurred during data fetching.',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 📌 **دریافت داده از یک منبع خاص**
 * @param {Object} source - منبع داده
 * @returns {Promise<Object>} - داده‌های دریافت‌شده
 */
async function fetchFromSource(source) {
  try {
    const response = await axios.get(source.url);
    
    // بررسی داده‌های دریافتی
    if (!response.data || !response.data.data) {
      logger.error(`❌ Invalid response format from ${source.name}`);
      return null;
    }

    let categorizedData = {};

    // پردازش داده‌های دریافتی
    Object.entries(response.data.data).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        categorizedData[category] = items.map(item => ({
          symbol: item.symbol,
          category: category,
          name: item.name,
          price: item.price,
          unit: item.unit || "IRR"
        }));
      } else if (typeof items === "object") {
        categorizedData[category] = {
          symbol: "SILVER999",
          category: category,
          name: items.name,
          price: items.price,
          unit: "تومان"
        };
      }
    });

    return {
      sourceId: source.id,
      categoryId: source.category_id,
      fetchId: uuidv4(),
      data: categorizedData
    };
  } catch (error) {
    logger.error(`❌ Error fetching from ${source.name}:`, error);
    return null;
  }
}

/**
 * 📌 **Get cached data with specified TTL**
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<Object>} - Cached data or fresh data if cache expired
 */
async function getCachedData(ttl) {
  if (!isInitialized) {
    await initialize();
  }

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Get data from database
    const data = await databaseService.getTodayData(today);
    
    if (!data) {
      // If no data exists for today, fetch fresh data
      const fetchResult = await fetchDataWithTracking('cache-miss');
      if (!fetchResult.success) {
        throw new Error('Failed to fetch fresh data');
      }
      return await databaseService.getTodayData(today);
    }

    // Check if data is within TTL
    const dataTimestamp = new Date(data.meta.timestamp);
    const now = new Date();
    const age = now - dataTimestamp;

    if (age > ttl) {
      // Cache expired, fetch fresh data
      const fetchResult = await fetchDataWithTracking('cache-expired');
      if (!fetchResult.success) {
        throw new Error('Failed to fetch fresh data');
      }
      return await databaseService.getTodayData(today);
    }

    return data;
  } catch (error) {
    logger.error('❌ Error in getCachedData:', error);
    throw error;
  }
}

module.exports = {
  initialize,
  setupScheduledFetching,
  fetchDataWithTracking,
  fetchFromSource,
  getCachedData,
};