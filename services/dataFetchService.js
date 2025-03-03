const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const databaseService = require("../services/databaseService");

// منابع داده و وضعیت اولیه
let dataSources = [];
let isInitialized = false;

/**
 * 📌 **بارگذاری منابع داده از دیتابیس**
 */
async function initialize() {
  try {
    dataSources = await databaseService.getActiveDataSources();
    isInitialized = true;
    console.log(`✅ Data fetch service initialized with ${dataSources.length} sources`);

    if (dataSources.length < 3) {
      console.warn("⚠️ Warning: Less than 3 active data sources available.");
    }
  } catch (error) {
    console.error("❌ Error initializing data fetch service:", error);
    throw error;
  }
}
/**
 * 📌 **تنظیم `cron job` برای دریافت خودکار داده‌ها**
 */
function setupScheduledFetching() {
  const cron = require("node-cron");

  // اجرای درخواست هر ساعت
  cron.schedule("0 * * * *", async () => {
    console.log("🔄 Running hourly data fetch...");
    try {
      await fetchDataWithTracking("hourly");
    } catch (error) {
      console.error("❌ Scheduled fetch failed:", error);
    }
  });

  console.log("✅ Scheduled data fetching set up");
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
      console.error("🚨 More than 50% of sources failed. Skipping database update.");
      return {
        success: false,
        fetchId,
        error: "More than 50% of sources failed",
        duration: Date.now() - startTime,
      };
    }

    if (successResults.length > 0) {
      // **✅ استفاده از `ON DUPLICATE KEY UPDATE` برای جلوگیری از داده تکراری**
      recordsStored = await databaseService.storeHourlyData(successResults, fetchId);
    }

    return {
      success: recordsStored > 0,
      fetchId,
      recordsStored,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error("❌ Error in fetchDataWithTracking:", error);
    return {
      success: false,
      fetchId,
      error: error.message,
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
    const latestPrice = await databaseService.getLatestPrice(source.symbol);

    // ✅ بررسی تغییرات قیمت (از تکرار داده‌ها جلوگیری می‌کند)
    if (latestPrice && latestPrice.price === response.data.price) {
      console.log(`🔄 No price change for ${source.symbol}, skipping...`);
      return null;
    }

    return {
      symbol: source.symbol,
      categoryId: source.category_id,
      name: source.name,
      price: response.data.price,
      unit: response.data.unit || "IRR",
      sourceId: source.id,
    };
  } catch (error) {
    console.error(`❌ Error fetching from ${source.name}:`, error);
    return null;
  }
}

module.exports = {
  initialize,
  setupScheduledFetching,
  fetchDataWithTracking,
  fetchFromSource,
};