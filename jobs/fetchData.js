const axios = require("axios");
const cron = require("node-cron");
const { insertPrice } = require("../services/databaseService");
const PriceModel = require("../models/priceModel");

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


async function fetchPrices() {
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

        // 📌 ذخیره داده‌های `gold`
        if (goldCurrencyResponse.gold) {
            for (const item of goldCurrencyResponse.gold) {
                const priceModel = new PriceModel(item.name, item.symbol, "metal", new Date(), item.price, item.unit === "تومان" ? "IRR" : "USD");
                await insertPrice(priceModel.name, priceModel.symbol, priceModel.category, priceModel.price, priceModel.unit);
            }
        }

        // 📌 ذخیره داده‌های `currency`
        if (goldCurrencyResponse.currency) {
            for (const item of goldCurrencyResponse.currency) {
                const priceModel = new PriceModel(item.name, item.symbol, "currency", new Date(), item.price, item.unit === "تومان" ? "IRR" : "USD");
                await insertPrice(priceModel.name, priceModel.symbol, priceModel.category, priceModel.price, priceModel.unit);
            }
        }

        // 📌 ذخیره داده‌های `cryptocurrency`
        if (goldCurrencyResponse.cryptocurrency) {
            for (const item of goldCurrencyResponse.cryptocurrency) {
                const priceModel = new PriceModel(item.name, item.symbol, "cryptocurrency", new Date(), item.price, "USD");
                await insertPrice(priceModel.name, priceModel.symbol, priceModel.category, priceModel.price, priceModel.unit);
            }
        }

        // 📌 ذخیره داده‌های `silver`
        if (silverPrice) {
            const priceModel = new PriceModel("نقره 999", "SILVER", "metal", new Date(), silverPrice, "IRR");
            await insertPrice(priceModel.name, priceModel.symbol, priceModel.category, priceModel.price, priceModel.unit);
        }

        console.log("✅ Prices fetched and inserted successfully!");
    } catch (error) {
        console.error("❌ Error fetching data:", error.message);
    }
}


// 📌 تغییر کرون‌جاب به اجرا هر یک ساعت
cron.schedule("0 * * * *", () => {
    console.log(`🔄 Fetching new data at ${new Date().toLocaleString()}`);
    fetchPrices();
});

cron.schedule("*/5 * * * *", () => {
    console.log(`🕐 Cron test at ${new Date().toLocaleString()}`);
});


fetchPrices();
module.exports = fetchPrices;
