const axios = require("axios");
const db = require("../config/db");
const cron = require("node-cron");

async function fetchDataWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, options);
            return response.data;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Retrying (${i + 1}/${retries})...`);
            await new Promise((r) => setTimeout(r, 5000));
        }
    }
}

const fetchPrices = async () => {
  try {
      const goldCurrencyResponse = await fetchDataWithRetry("https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency_v2.json");
      let silverPrice = null;

      try {
          const silverResponse = await fetchDataWithRetry("https://call4.tgju.org/ajax.json", {
              headers: { accept: "*/*", "accept-language": "en-US,en;q=0.9,fa;q=0.8" },
          });
          silverPrice = silverResponse?.current?.silver_999?.p ? parseFloat(silverResponse.current.silver_999.p.replace(/,/g, "")) : null;
      } catch (silverErr) {
          console.error("❌ Error fetching silver data:", silverErr.message);
      }

      const finalData = {
          gold: goldCurrencyResponse.gold || [],
          currency: goldCurrencyResponse.currency || [],
          cryptocurrency: goldCurrencyResponse.cryptocurrency || [],
          silver: silverPrice ? { name: "نقره 999", price: silverPrice } : {},
      };

      if (!finalData || Object.keys(finalData).length === 0) {
          console.error("❌ Data is empty, skipping save.");
          return;
      }

      const jsonData = JSON.stringify(finalData);
      const today = new Date().toISOString().split("T")[0];

      // بررسی اینکه آیا داده‌ای برای امروز ذخیره شده یا نه
      db.query("SELECT id FROM gold_prices WHERE DATE(date) = ?", [today], (err, result) => {
          if (err) {
              console.error("❌ Database error:", err);
              return;
          }

          if (result.length > 0) {
              console.log("🔄 Data for today exists. Updating...");

              // **حذف داده‌های قبلی و درج داده‌ی جدید**
              db.query("DELETE FROM gold_prices WHERE DATE(date) = ?", [today], (deleteErr) => {
                  if (deleteErr) {
                      console.error("❌ Error deleting old data:", deleteErr);
                      return;
                  }
                  console.log("✅ Old data deleted. Inserting new data...");

                  db.query("INSERT INTO gold_prices (date, data) VALUES (NOW(), ?)", [jsonData], (insertErr) => {
                      if (insertErr) console.error("❌ Error saving data:", insertErr);
                      else console.log("✅ Data saved successfully!", jsonData);
                  });
              });
          } else {
              // **درج مستقیم داده اگر برای امروز قبلاً ذخیره نشده باشد**
              db.query("INSERT INTO gold_prices (date, data) VALUES (NOW(), ?)", [jsonData], (insertErr) => {
                  if (insertErr) console.error("❌ Error saving data:", insertErr);
                  else console.log("✅ Data saved successfully!", jsonData);
              });
          }
      });

  } catch (error) {
      console.error("❌ Error fetching data:", error.message);
  }
};



cron.schedule("0 8 * * *", () => {
    console.log("🔄 Fetching new data at 8 AM...");
    fetchPrices();
});

cron.schedule("0 20 * * *", () => {
    console.log("🔄 Fetching new data at 8 PM...");
    fetchPrices();
});

fetchPrices();
module.exports = fetchPrices;
