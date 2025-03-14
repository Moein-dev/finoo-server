const db = require("../config/db");
const PriceModel = require("../models/priceModel");


async function getDataByDate(date, lastPrice, limit, offset) {
    if (!date) {
        date = new Date().toISOString().split("T")[0]; // تاریخ امروز
    }

    // بررسی نداشتن تاریخ آینده
    const today = new Date().toISOString().split("T")[0];
    if (date > today) {
        throw new Error("Date cannot be in the future.");
    }

    // 📌 اگر `last_price=true` فقط آخرین مقدار آن روز را برگردان
    if (lastPrice) {
        const query = `
            SELECT p1.* FROM prices p1
            INNER JOIN (
                SELECT symbol, MAX(date) AS max_date
                FROM prices
                WHERE DATE(date) = ?
                GROUP BY symbol
            ) p2
            ON p1.symbol = p2.symbol AND p1.date = p2.max_date
            ORDER BY p1.date DESC;
        `;
        const [rows] = await db.query(query, [date]);
        return { data: rows.map(row => PriceModel.fromDatabase(row)), totalRecords: rows.length, requestedDate: date };
    }

    // 📌 دریافت تعداد کل رکوردها برای `pagination`
    const countQuery = `SELECT COUNT(*) AS totalRecords FROM prices WHERE DATE(date) = ?`;
    const [[{ totalRecords }]] = await db.query(countQuery, [date]);

    // 📌 دریافت کل داده‌های روز
    const dataQuery = `
        SELECT * FROM prices 
        WHERE DATE(date) = ?
        ORDER BY date DESC
        LIMIT ? OFFSET ?
    `;
    const [result] = await db.query(dataQuery, [date, limit, offset]);

    return { data: result.map(row => PriceModel.fromDatabase(row)), totalRecords, requestedDate: date };
}

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
async function getDataInRange(startDate, endDate, limit, offset) {
    // بررسی اینکه تاریخ پایان از تاریخ شروع عقب‌تر نباشد
    if (startDate > endDate) {
        throw new Error("Invalid date range. The start date cannot be after the end date.");
    }

    // 📌 دریافت تعداد کل رکوردها در بازه زمانی
    const countQuery = `
        SELECT COUNT(*) AS totalRecords FROM prices 
        WHERE date BETWEEN ? AND ?
    `;
    const [[{ totalRecords }]] = await db.query(countQuery, [startDate, endDate]);

    // 📌 دریافت داده‌های بازه زمانی
    const dataQuery = `
        SELECT * FROM prices 
        WHERE date BETWEEN ? AND ?
        ORDER BY date ASC
        LIMIT ? OFFSET ?
    `;
    const [results] = await db.query(dataQuery, [startDate, endDate, limit, offset]);

    // 📌 محاسبه میانگین قیمت‌ها
    const avgQuery = `
        SELECT symbol, category, unit, AVG(price) AS avg_price 
        FROM prices 
        WHERE date BETWEEN ? AND ?
        GROUP BY symbol, category, unit
        ORDER BY avg_price DESC
    `;
    const [avgResults] = await db.query(avgQuery, [startDate, endDate]);

    return { 
        data: results.map(row => PriceModel.fromDatabase(row)), 
        totalRecords, 
        startDate, 
        endDate, 
        avgPrices: avgResults 
    };
}


// 📌 تابع ذخیره‌سازی داده‌ها در دیتابیس
async function insertPrice(name, symbol, category, price, unit) {
    console.log(`🔍 Checking insert for ${symbol} at ${new Date().toLocaleString()}`);

    const query = `
        INSERT INTO prices (name, symbol, category, date, price, unit)
        VALUES (?, ?, ?, NOW(), ?, ?)
    `;
    try {
        await db.query(query, [name, symbol, category, price, unit]);
        console.log(`✅ Inserted ${name} (${symbol}) into ${category}`);
    } catch (error) {
        console.error(`❌ Error inserting ${name} into ${category}:`, error);
    }
}

async function searchPrices(symbol = null, category = null, page = 1, limit = 10) {
    let whereClause = [];
    let queryParams = [];

    if (symbol) {
        whereClause.push("symbol = ?");
        queryParams.push(symbol);
    }
    if (category) {
        whereClause.push("category = ?");
        queryParams.push(category);
    }

    const whereSQL = whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : "";

    // 📌 دریافت تعداد کل رکوردها
    const countQuery = `SELECT COUNT(*) AS totalRecords FROM prices ${whereSQL}`;
    const [[{ totalRecords }]] = await db.query(countQuery, queryParams);

    // 📌 `pagination`
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    // 📌 دریافت داده‌ها
    const dataQuery = `
        SELECT * FROM prices 
        ${whereSQL}
        ORDER BY date DESC
        LIMIT ? OFFSET ?
    `;
    const [results] = await db.query(dataQuery, queryParams);

    return { data: results.map(row => PriceModel.fromDatabase(row)), totalRecords };
}

async function getSymbols() {
    const query = `SELECT DISTINCT symbol FROM prices ORDER BY symbol ASC`;
    const [symbols] = await db.query(query);
    return symbols.map(s => s.symbol);
}

async function getCategories() {
    const query = `SELECT DISTINCT category FROM prices ORDER BY category ASC`;
    const [categories] = await db.query(query);
    return categories.map(c => c.category);
}

module.exports = {
    getDataByDate,
    getDataInRange,
    insertPrice,
    searchPrices, 
    getSymbols,
    getCategories
};
