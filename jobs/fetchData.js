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

      const connection = await db.getConnection(); // گرفتن کانکشن برای `TRANSACTION`
      try {
          await connection.beginTransaction(); // شروع `TRANSACTION`

          await connection.query("DELETE FROM gold_prices WHERE DATE(date) = ?", [today]);
          await connection.query("INSERT INTO gold_prices (date, data) VALUES (NOW(), ?)", [jsonData]);

          await connection.commit(); // تایید `TRANSACTION`
          console.log("✅ Data updated successfully!", jsonData);
      } catch (error) {
          await connection.rollback(); // در صورت خطا، `ROLLBACK` انجام می‌شود
          console.error("❌ Error updating data:", error);
      } finally {
          connection.release(); // آزاد کردن کانکشن
      }
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
