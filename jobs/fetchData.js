const axios = require("axios");
const {
  insertPrice,
  hasDataForDate,
  getAllCurrencies,
} = require("../services/databaseService");
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
        console.warn(
          `⚠️ Error fetching from ${url}, attempt (${i + 1}/${retries})`
        );
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
      "https://call1.tgju.org/ajax.json",
      "https://call3.tgju.org/ajax.json",
      "https://call2.tgju.org/ajax.json",
      "https://call.tgju.org/ajax.json",
      "https://call4.tgju.org/ajax.json",
    ];
    const tgjuResponse = await fetchDataWithRetry(tgjuUrls, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,fa;q=0.8",
      },
    });

    const currencies = await getAllCurrencies();

    const now = overrideDate ? new Date(overrideDate) : new Date();

    for (const currency of currencies) {
      const rawPrice = tgjuResponse?.current?.[currency.server_key]?.p;
      const rawDp = tgjuResponse?.current?.[currency.server_key]?.dp ?? null;
      const rawD = tgjuResponse?.current?.[currency.server_key]?.d ?? null;

      let dp = null;
      if (rawDp !== null && rawD !== null) {
        const numericD = parseFloat(rawD);
        dp = numericD < 0 ? -rawDp : rawDp;
      }

      if (!rawPrice) {
        console.warn(
          `⚠️ Missing price for ${currency.symbol} (${currency.name})`
        );
        continue;
      }

      const unit = currency.symbol === "DASH" ? "USD" : "IRR";
      const numericPrice = Number(rawPrice.replace(/,/g, ""));
      if (isNaN(numericPrice)) {
        console.warn(
          `⚠️ Invalid numeric value for ${currency.symbol}: ${rawPrice}`
        );
        continue;
      }
      const finalPrice = unit === "IRR" ? numericPrice / 10 : numericPrice;

      await insertPrice(
        currency.name,
        currency.server_key,
        finalPrice,
        now,
        dp
      );
    }

    console.log("✅ Prices fetched and inserted successfully!");
  } catch (error) {
    console.error("❌ Error fetching TGJU data:", error.message);
  }
}
