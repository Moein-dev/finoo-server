const axios = require("axios");
const db = require("../config/db");
const cron = require("node-cron");

const fetchPrices = async () => {
  try {
    // دریافت داده‌ها از API اول (طلا، ارز، کریپتو)
    const goldCurrencyResponse = await axios.get(
      "https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency_v2.json"
    );
    const goldCurrencyData = goldCurrencyResponse.data;

    // دریافت داده‌ها از API دوم (نقره ۹۹۹)
    const silverResponse = await axios.get("https://call4.tgju.org/ajax.json", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,fa;q=0.8",
      },
    });

    const silverData = silverResponse.data;
    const silverPrice =
      silverData?.current?.silver_999?.p
        ? parseFloat(silverData.current.silver_999.p.replace(/,/g, ""))
        : null;

    // آماده‌سازی داده نهایی برای ذخیره در MySQL
    const finalData = {
      gold: goldCurrencyData.gold || [],
      currency: goldCurrencyData.currency || [],
      cryptocurrency: goldCurrencyData.cryptocurrency || [],
      silver: silverPrice ? { name: "نقره ۹۹۹", price: silverPrice } : {},
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
  }
};

// اجرای کرون جاب هر ۲۴ ساعت
cron.schedule("0 0 * * *", () => {
  console.log("🔄 Fetching new data...");
  fetchPrices();
});

// اجرای اولیه
fetchPrices();

module.exports = fetchPrices;
