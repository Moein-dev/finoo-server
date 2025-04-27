const axios = require("axios");
const { insertPrice, hasDataForDate } = require("../services/databaseService");
const PriceModel = require("../models/priceModel");
const schedule = require("node-schedule");
const moment = require("moment-timezone");

async function fetchDataWithRetry(urls, options = {}, retries = 5) {
  for (const url of urls) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, options);
        console.log(`✅ Success fetching from: ${url}`);
        return response.data;
      } catch (error) {
        console.warn(`⚠️ Error fetching from ${url}, attempt (${i + 1}/${retries})`);
        if (i === retries - 1) {
          console.warn(`❌ Failed after ${retries} attempts for ${url}`);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  throw new Error("❌ All backup URLs failed after retries.");
}


async function checkInRangeTime() {
  const now = moment().tz("Asia/Tehran"); // استفاده از زمان تهران

  console.log("🕒 Current time:", now.format());

  const hour = now.hour();
  const minutes = now.minute();

  console.log("🕒 Current hour:", hour);
  console.log("🕒 Current minutes:", minutes);

  // فقط ساعت ۸ تا ۲۳ را چک کنید (بدون محدودیت دقیقه و ثانیه)
  const isInRange = hour >= 8 && hour <= 23;

  console.log("⏰ Is in range:", isInRange);
  return isInRange;
}

(async () => {
  const yesterday = moment()
    .tz("Asia/Tehran")
    .subtract(1, "day")
    .format("YYYY-MM-DD");
  const exists = await hasDataForDate(yesterday);
  if (!exists) {
    console.log(`📌 No data found for ${yesterday}. Fetching for yesterday...`);
    await fetchPrices(yesterday);
  } else {
    console.log(`✅ Data already exists for ${yesterday}.`);
  }

  // اجرای اولیه برای امروز
  await fetchPrices();

  // اجرای `fetchPrices` رأس هر ساعت از ساعت ۸ صبح تا ۱۱ شب تهران
  schedule.scheduleJob("0 * * * *", fetchPrices);
})();

async function fetchPrices(overrideDate = null) {
  if (!overrideDate) {
    const checking = await checkInRangeTime();
    console.log("🕒 Checking time:", checking);
    if (!checking) {
      console.log("⏰ Fetching data is not allowed at this time");
      return;
    }
  }

  try {
    const tgjuUrls = [
      "https://call4.tgju.org/ajax.json",
      "https://call.tgju.org/ajax.json",
      "https://call2.tgju.org/ajax.json",
      "https://call3.tgju.org/ajax.json",
    ];
    const tgjuResponse = await fetchDataWithRetry(tgjuUrls, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,fa;q=0.8",
      },
    });

    const map = {
      // 🟡 فلزات
      retail_sekeb: {
        symbol: "BACOIN",
        name: "سکه بهار آزادی",
        category: "metal",
      },
      geram18: { symbol: "Gold18", name: "طلای 18 عیار", category: "metal" },
      gerami: { symbol: "GRCOIN", name: "سکه گرمی", category: "metal" },
      nim: { symbol: "HACOIN", name: "نیم سکه", category: "metal" },
      retail_sekee: { symbol: "IMCOIN", name: "سکه امامی", category: "metal" },
      rob: { symbol: "QUCOIN", name: "ربع سکه", category: "metal" },
      silver_999: { symbol: "SILVER", name: "نقره 999", category: "metal" },
      ons: { symbol: "XAUUSD", name: "انس طلا", category: "metal" },
      // 💱 ارزها
      price_aed: { symbol: "AED", name: "درهم امارات", category: "currency" },
      price_afn: { symbol: "AFN", name: "افغانی", category: "currency" },
      price_amd: { symbol: "AMD", name: "درام ارمنستان", category: "currency" },
      price_aud: { symbol: "AUD", name: "دلار استرالیا", category: "currency" },
      price_cad: { symbol: "CAD", name: "دلار کانادا", category: "currency" },
      price_chf: { symbol: "CHF", name: "فرانک سوئیس", category: "currency" },
      price_cny: { symbol: "CNY", name: "یوان چین", category: "currency" },
      price_eur: { symbol: "EUR", name: "يورو", category: "currency" },
      price_gbp: { symbol: "GBP", name: "پوند انگلیس", category: "currency" },
      price_inr: { symbol: "INR", name: "روپیه هند", category: "currency" },
      price_iqd: { symbol: "IQD", name: "دینار عراق", category: "currency" },
      price_jpy: { symbol: "JPY", name: "ین ژاپن", category: "currency" },
      price_rub: { symbol: "RUB", name: "روبل روسیه", category: "currency" },
      price_thb: { symbol: "THB", name: "بات تایلند", category: "currency" },
      price_try: { symbol: "TRY", name: "لیر ترکیه", category: "currency" },
      price_dollar_rl: { symbol: "USD", name: "دلار", category: "currency" },

      // 🪙 رمز‌ارزها
      "crypto-bitcoin-irr": {
        symbol: "BTC",
        name: "بیت کوین",
        category: "cryptocurrency",
      },
      "crypto-dash": { symbol: "DASH", name: "دش", category: "cryptocurrency" },
      "crypto-ethereum-irr": {
        symbol: "ETH",
        name: "اتریوم",
        category: "cryptocurrency",
      },
      "crypto-litecoin-irr": {
        symbol: "LTC",
        name: "لایت کوین",
        category: "cryptocurrency",
      },
      "crypto-ripple-irr": {
        symbol: "XRP",
        name: "ریپل",
        category: "cryptocurrency",
      },
      "crypto-tether-irr": {
        symbol: "USDT",
        name: "تتر",
        category: "cryptocurrency",
      },
    };

    const now = overrideDate ? new Date(overrideDate) : new Date();

    for (const [key, { symbol, name, category }] of Object.entries(map)) {
      const rawPrice = tgjuResponse?.current?.[key]?.p;

      if (!rawPrice) {
        console.warn(`⚠️ Missing price for ${symbol} (${name})`);
        continue;
      }

      const unit = symbol === "DASH" ? "USD" : "IRR";

      const numericPrice = Number(rawPrice.replace(/,/g, ""));
      if (isNaN(numericPrice)) {
        console.warn(`⚠️ Invalid numeric value for ${symbol}: ${rawPrice}`);
        continue;
      }
      const finalPrice = unit === "IRR" ? numericPrice / 10 : numericPrice;

      const priceModel = new PriceModel(
        name,
        symbol,
        category,
        now,
        finalPrice,
        unit
      );
      await insertPrice(
        priceModel.name,
        priceModel.symbol,
        priceModel.category,
        priceModel.price,
        priceModel.unit,
        now
      );
    }

    console.log("✅ Prices fetched and inserted successfully!");
  } catch (error) {
    console.error("❌ Error fetching TGJU data:", error.message);
  }
}
