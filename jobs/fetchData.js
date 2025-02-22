const axios = require("axios");
const db = require("../config/db");
const cron = require("node-cron");

// تابع Retry Mechanism
async function fetchDataWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, options);
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error; // آخرین تلاش
      console.warn(`Retrying (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, 5000)); // 5 ثانیه تاخیر
    }
  }
}

const fetchPrices = async () => {
  try {
    // دریافت داده‌ها از API اول با Retry Mechanism
    const goldCurrencyResponse = await fetchDataWithRetry(
      "https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency_v2.json"
    );
    const goldCurrencyData = goldCurrencyResponse;

    // دریافت داده‌ها از API دوم با Retry Mechanism
    const silverResponse = await fetchDataWithRetry("https://call4.tgju.org/ajax.json", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,fa;q=0.8",
      },
    });
    const silverData = silverResponse;
    const silverPrice =
      silverData?.current?.silver_999?.p
        ? parseFloat(silverData.current.silver_999.p.replace(/,/g, ""))
        : null;

    // آماده‌سازی داده نهایی برای ذخیره در MySQL
    const finalData = {
      gold: goldCurrencyData.gold || [],
      currency: goldCurrencyData.currency || [],
      cryptocurrency: goldCurrencyData.cryptocurrency || [],
      silver: silverPrice ? { name: "نقره 999", price: silverPrice } : {},
    };

    // ذخیره در دیتابیس
    const query = "INSERT INTO gold_prices (date, data) VALUES (NOW(), ?)";
    db.query(query, [JSON.stringify(finalData)], (err, result) => {
      if (err) {
        console.error("❌ Error saving data:", err);
      } else {
        console.log("✅ Data saved successfully!", finalData);
      }
    });
  } catch (error) {
    console.error("❌ Error fetching data:", error.message);

    // دریافت داده‌های قدیمی از دیتابیس
    db.query("SELECT data FROM gold_prices ORDER BY date DESC LIMIT 1", (err, result) => {
      if (err) {
        console.error("Error fetching previous data:", err);
        return;
      }
  
      const previousData = result[0]?.data;
      if (previousData) {
        console.warn("Saving previous data due to failure...");
        db.query("INSERT INTO gold_prices (date, data) VALUES (NOW(), ?)", [previousData], (err) => {
          if (err) console.error("Error saving previous data:", err);
        });
      }
    });
  }
};

const fetchPricesAndReplaceIfExists = async () => {
  try {
    // دریافت داده‌ها از API‌ها
    const goldCurrencyResponse = await fetchDataWithRetry(
      "https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency_v2.json"
    );
    const goldCurrencyData = goldCurrencyResponse;

    const silverResponse = await fetchDataWithRetry("https://call4.tgju.org/ajax.json", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,fa;q=0.8",
      },
    });
    const silverData = silverResponse;
    const silverPrice =
      silverData?.current?.silver_999?.p
        ? parseFloat(silverData.current.silver_999.p.replace(/,/g, ""))
        : null;

    // آماده‌سازی داده نهایی
    const finalData = {
      gold: goldCurrencyData.gold || [],
      currency: goldCurrencyData.currency || [],
      cryptocurrency: goldCurrencyData.cryptocurrency || [],
      silver: silverPrice ? { name: "نقره 999", price: silverPrice } : {},
    };

    // بررسی وجود داده برای همان روز
    const today = new Date().toISOString().split("T")[0];
    db.query("SELECT id FROM gold_prices WHERE DATE(date) = ?", [today], (err, result) => {
      if (err) {
        console.error("Error checking existing data:", err);
        return;
      }

      if (result.length > 0) {
        // اگر داده وجود دارد، آن را به‌روزرسانی کن
        const id = result[0].id;
        db.query(
          "UPDATE gold_prices SET data = ? WHERE id = ?",
          [JSON.stringify(finalData), id],
          (err) => {
            if (err) console.error("Error updating data:", err);
            else console.log("✅ Data updated successfully!", finalData);
          }
        );
      } else {
        // اگر داده وجود ندارد، جدیدی ایجاد کن
        db.query(
          "INSERT INTO gold_prices (date, data) VALUES (?, ?)",
          [today, JSON.stringify(finalData)],
          (err) => {
            if (err) console.error("Error inserting data:", err);
            else console.log("✅ Data inserted successfully!", finalData);
          }
        );
      }
    });
  } catch (error) {
    console.error("❌ Error fetching and replacing data:", error.message);
  }
};


// اجرای کرون جاب ساعت 8 صبح و 8 شب
cron.schedule("0 8 * * *", () => { // ساعت 8 صبح
  console.log("🔄 Fetching new data at 8 AM...");
  fetchPrices();
});

cron.schedule("0 20 * * *", () => { // ساعت 8 شب
  console.log("🔄 Fetching new data at 8 PM...");
  fetchPricesAndReplaceIfExists();
});

// اجرای اولیه
fetchPrices();

module.exports = fetchPrices;
