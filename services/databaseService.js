const db = require("../config/db");
const PriceModel = require("../models/priceModel");


async function getDataByDate(date, lastPrice, limit = 10, offset = 0) {
    if (!date) {
        date = new Date().toISOString().split("T")[0]; // امروز
    }

    const today = new Date().toISOString().split("T")[0];
    if (date > today) {
        throw new Error("Date cannot be in the future.");
    }

    if (lastPrice) {
        const query = `
            SELECT p1.* FROM prices p1
            INNER JOIN (
                SELECT symbol, MAX(date) AS max_date
                FROM prices
                WHERE DATE(date) = ?
                GROUP BY symbol
            ) latest
            ON p1.symbol = latest.symbol AND p1.date = latest.max_date
            LEFT JOIN currencies_meta m ON p1.symbol = m.symbol
            ORDER BY COALESCE(m.priority, 999) ASC, p1.symbol ASC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(query, [date, limit, offset]);
        return {
            data: rows.map(row => PriceModel.fromDatabase(row)),
            totalRecords: rows.length,
            requestedDate: date,
            lastPriceMode: true
        };
    }

    // اگر lastPrice=false یا undefined بود
    const countQuery = `SELECT COUNT(*) AS totalRecords FROM prices WHERE DATE(date) = ?`;
    const [[{ totalRecords }]] = await db.query(countQuery, [date]);

    const dataQuery = `
        SELECT * FROM prices 
        WHERE DATE(date) = ?
        ORDER BY date DESC
        LIMIT ? OFFSET ?
    `;
    const [result] = await db.query(dataQuery, [date, limit, offset]);

    return {
        data: result.map(row => PriceModel.fromDatabase(row)),
        totalRecords,
        requestedDate: date,
        lastPriceMode: false
    };
}

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
async function getDataInRange(startDate, endDate, limit, offset) {
    if (startDate > endDate) {
        throw new Error("Invalid date range. The start date cannot be after the end date.");
    }

    const countQuery = `
        SELECT COUNT(*) AS totalRecords FROM prices 
        WHERE date BETWEEN ? AND ?
    `;
    const [[{ totalRecords }]] = await db.query(countQuery, [startDate, endDate]);

    const dataQuery = `
        SELECT p.* FROM prices p
        LEFT JOIN currencies_meta m ON p.symbol = m.symbol
        WHERE p.date BETWEEN ? AND ?
        ORDER BY m.priority ASC, p.symbol ASC
        LIMIT ? OFFSET ?
    `;
    const [results] = await db.query(dataQuery, [startDate, endDate, limit, offset]);

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
        whereClause.push("p.symbol = ?");
        queryParams.push(symbol);
    }
    if (category) {
        whereClause.push("p.category = ?");
        queryParams.push(category);
    }

    const whereSQL = whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) AS totalRecords FROM prices p ${whereSQL}`;
    const [[{ totalRecords }]] = await db.query(countQuery, queryParams);

    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const dataQuery = `
        SELECT p.* FROM prices p
        LEFT JOIN currencies_meta m ON p.symbol = m.symbol
        ${whereSQL}
        ORDER BY m.priority ASC, p.symbol ASC
        LIMIT ? OFFSET ?
    `;
    const [results] = await db.query(dataQuery, queryParams);

    return { data: results.map(row => PriceModel.fromDatabase(row)), totalRecords };
}

async function getSymbols() {
    const query = `SELECT symbol FROM currencies_meta ORDER BY priority ASC`;
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
