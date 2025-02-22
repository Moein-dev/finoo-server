const db = require("../config/db");

// 📌 دریافت داده‌های امروز
async function getTodayData(today) {
    const [result] = await db.query("SELECT data FROM gold_prices WHERE DATE(date) = ? ORDER BY date DESC LIMIT 1", [today]);
    return result.length > 0 ? JSON.parse(result[0].data) : null;
}

// 📌 دریافت کل داده‌های ذخیره‌شده (با `pagination`)
async function getAllData(limit, offset) {
    const countQuery = `
        SELECT COUNT(*) AS totalRecords FROM gold_prices 
        WHERE id IN (SELECT MIN(id) FROM gold_prices GROUP BY DATE(date))
    `;
    const [[{ totalRecords }]] = await db.query(countQuery);

    const dataQuery = `
        SELECT data FROM gold_prices 
        WHERE id IN (SELECT MIN(id) FROM gold_prices GROUP BY DATE(date))
        ORDER BY DATE(date) DESC
        LIMIT ? OFFSET ?
    `;
    const [result] = await db.query(dataQuery, [limit, offset]);
    
    return { data: result.map(row => JSON.parse(row.data)), totalRecords };
}

// 📌 دریافت داده‌های بین دو تاریخ (با `pagination`)
async function getDataInRange(start, end, limit, offset) {
    const countQuery = `
        SELECT COUNT(*) AS totalRecords FROM gold_prices 
        WHERE date BETWEEN ? AND ?
    `;
    const [[{ totalRecords }]] = await db.query(countQuery, [start, end]);

    const dataQuery = `
        SELECT data FROM gold_prices 
        WHERE date BETWEEN ? AND ?
        ORDER BY date ASC
        LIMIT ? OFFSET ?
    `;
    const [results] = await db.query(dataQuery, [start, end, limit, offset]);
    
    return { data: results.map(row => JSON.parse(row.data)), totalRecords };
}

module.exports = {
    getTodayData,
    getAllData,
    getDataInRange,
};
