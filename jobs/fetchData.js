const axios = require("axios");
const { insertPrice } = require("../services/databaseService");
const PriceModel = require("../models/priceModel");
const schedule = require('node-schedule');
const moment = require('moment-timezone');

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

async function checkInRangeTime() {
    const now = moment().tz('Asia/Tehran'); // استفاده از زمان تهران
    
    console.log('🕒 Current time:', now.format());
    
    const hour = now.hour();
    const minutes = now.minute();
    
    console.log('🕒 Current hour:', hour);
    console.log('🕒 Current minutes:', minutes);
    
    // فقط ساعت ۸ تا ۲۳ را چک کنید (بدون محدودیت دقیقه و ثانیه)
    const isInRange = (hour >= 8 && hour <= 23);
    
    console.log('⏰ Is in range:', isInRange);
    return isInRange;
}

async function fetchPrices() {
    const checking = await checkInRangeTime();
    console.log('🕒 Checking time:', checking); 
    if (!checking) {
        console.log('⏰ Fetching data is not allowed at this time');
        return;
    }

    try {
        const tgjuResponse = await fetchDataWithRetry("https://call4.tgju.org/ajax.json", {
            headers: {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9,fa;q=0.8"
            },
        });

        const map = {
            // 🟡 فلزات
            "retail_bahar": { symbol: "BACOIN", name: "سکه بهار آزادی", category: "metal" },
            "geram18": { symbol: "Gold18", name: "طلای 18 عیار", category: "metal" },
            "retail_gerami": { symbol: "GRCOIN", name: "سکه گرمی", category: "metal" }, // ← تغییر دادم
            "nim": { symbol: "HACOIN", name: "نیم سکه", category: "metal" },
            "retail_emami": { symbol: "IMCOIN", name: "سکه امامی", category: "metal" }, // ← این درسته
            "rob": { symbol: "QUCOIN", name: "ربع سکه", category: "metal" },
            "silver_999": { symbol: "SILVER", name: "نقره 999", category: "metal" },
            "ons": { symbol: "XAUUSD", name: "انس طلا", category: "metal" },
            // 💱 ارزها
            "price_aed":       { symbol: "AED",     name: "درهم امارات",     category: "currency" },
            "price_afn":       { symbol: "AFN",     name: "افغانی",          category: "currency" },
            "price_amd":       { symbol: "AMD",     name: "درام ارمنستان",   category: "currency" },
            "price_aud":       { symbol: "AUD",     name: "دلار استرالیا",   category: "currency" },
            "price_cad":       { symbol: "CAD",     name: "دلار کانادا",     category: "currency" },
            "price_chf":       { symbol: "CHF",     name: "فرانک سوئیس",     category: "currency" },
            "price_cny":       { symbol: "CNY",     name: "یوان چین",        category: "currency" },
            "price_eur":       { symbol: "EUR",     name: "يورو",            category: "currency" },
            "price_gbp":       { symbol: "GBP",     name: "پوند انگلیس",     category: "currency" },
            "price_inr":       { symbol: "INR",     name: "روپیه هند",       category: "currency" },
            "price_iqd":       { symbol: "IQD",     name: "دینار عراق",      category: "currency" },
            "price_jpy":       { symbol: "JPY",     name: "ین ژاپن",         category: "currency" },
            "price_rub":       { symbol: "RUB",     name: "روبل روسیه",      category: "currency" },
            "price_thb":       { symbol: "THB",     name: "بات تایلند",      category: "currency" },
            "price_try":       { symbol: "TRY",     name: "لیر ترکیه",       category: "currency" },
            "price_dollar_rl": { symbol: "USD",     name: "دلار",            category: "currency" },

            // 🪙 رمز‌ارزها
            "crypto-bitcoin-irr":   { symbol: "BTC", name: "بیت کوین",       category: "cryptocurrency" },
            "crypto-dash":          { symbol: "DASH", name: "دش",            category: "cryptocurrency" },
            "crypto-ethereum-irr":  { symbol: "ETH", name: "اتریوم",         category: "cryptocurrency" },
            "crypto-litecoin-irr":  { symbol: "LTC", name: "لایت کوین",      category: "cryptocurrency" },
            "crypto-ripple-irr":    { symbol: "XRP", name: "ریپل",           category: "cryptocurrency" },
        };

        const now = new Date();

        for (const [key, { symbol, name, category }] of Object.entries(map)) {
            const rawPrice = tgjuResponse?.current?.[key]?.p;

            if (!rawPrice) {
                console.warn(`⚠️ Missing price for ${symbol} (${name})`);
                continue;
            }

            const price = parseFloat(rawPrice.replace(/,/g, ""));
            const unit = "IRR";

            const priceModel = new PriceModel(name, symbol, category, now, price, unit);
            await insertPrice(priceModel.name, priceModel.symbol, priceModel.category, priceModel.price, priceModel.unit);
        }

        console.log("✅ Prices fetched and inserted successfully!");
    } catch (error) {
        console.error("❌ Error fetching TGJU data:", error.message);
    }
}



fetchPrices(); // اجرای اولیه

// اجرای `fetchPrices` رأس هر ساعت از ساعت ۸ صبح تا ۱۱ شب تهران
schedule.scheduleJob('0 * * * *', fetchPrices); 
