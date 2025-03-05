const db = require("../config/db");
const PriceModel = require("../models/priceModel");

// 📌 دریافت کل داده‌های ذخیره‌شده (با `pagination`)
async function getAllData(date, limit, offset) {
    const countQuery = `
        SELECT COUNT(*) AS totalRecords FROM prices 
        WHERE DATE(date) = ?
    `;
    const [[{ totalRecords }]] = await db.query(countQuery, [date]);

    const dataQuery = `
        SELECT * FROM prices 
        WHERE DATE(date) = ?
        ORDER BY date DESC
        LIMIT ? OFFSET ?
    `;
    const [result] = await db.query(dataQuery, [date, limit, offset]);

    return { data: result.map(row => PriceModel.fromDatabase(row)), totalRecords };
}

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
async function getDataInRange(start, end, limit, offset) {
    const countQuery = `
        SELECT COUNT(*) AS totalRecords FROM prices 
        WHERE date BETWEEN ? AND ?
    `;
    const [[{ totalRecords }]] = await db.query(countQuery, [start, end]);

    const dataQuery = `
        SELECT * FROM prices 
        WHERE date BETWEEN ? AND ?
        ORDER BY date ASC
        LIMIT ? OFFSET ?
    `;
    const [results] = await db.query(dataQuery, [start, end, limit, offset]);

    return { data: results.map(row => PriceModel.fromDatabase(row)), totalRecords };
}

// 📌 بررسی آخرین زمان ذخیره‌شده برای جلوگیری از داده‌های تکراری
async function shouldInsertNewData(category) {
    const query = `
        SELECT MAX(date) AS last_entry FROM prices WHERE category = ?
    `;
    const [rows] = await db.query(query, [category]);
    
    if (rows.length === 0 || !rows[0].last_entry) return true; // اگر داده‌ای نباشد، ذخیره کن

    const lastEntryTime = new Date(rows[0].last_entry);
    const currentTime = new Date();
    
    // بررسی اینکه آیا از آخرین ذخیره‌سازی حداقل ۱ ساعت گذشته است
    const diffInHours = (currentTime - lastEntryTime) / (1000 * 60 * 60);
    return diffInHours >= 1;
}

// 📌 تابع ذخیره‌سازی داده‌ها در دیتابیس
async function insertPrice(name, symbol, category, price, unit) {
    if (!(await shouldInsertNewData(category))) {
        console.log(`⏳ Skipping insert for ${category}, last entry was less than an hour ago.`);
        return;
    }

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

// 📌 دریافت داده‌های امروز و نمایش آخرین زمان ذخیره
async function getTodayData() {
    const today = new Date().toISOString().split("T")[0];

    const query = `SELECT * FROM prices WHERE DATE(date) = ? ORDER BY date DESC`;
    const [rows] = await db.query(query, [today]);
    
    if (rows.length === 0) return { message: "No data available for today" };

    // تبدیل داده‌ها به مدل `PriceModel`
    const prices = rows.map(row => PriceModel.fromDatabase(row));

    return { last_updated: prices[0].date, data: prices.map(p => p.toJSON()) };
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

module.exports = {
    getTodayData,
    getAllData,
    getDataInRange,
    insertPrice,
    searchPrices
};
