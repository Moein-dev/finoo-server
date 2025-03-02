const db = require("../config/db");

// 📌 Processes the raw data from database into a standardized format
function processRawData(rawData) {
  try {
    const parsedData = JSON.parse(rawData);
    
    // Return just the data portion if it exists in the new format
    if (parsedData.data && parsedData.meta) {
      return {
        data: parsedData.data,
        meta: parsedData.meta
      };
    }
    
    // Handle legacy data format (pre-refactoring)
    return {
      data: parsedData,
      meta: {
        fetched_at: null,
        sources: null
      }
    };
  } catch (error) {
    console.error("Error processing raw data:", error);
    return null;
  }
}

// �� دریافت داده‌های امروز
async function getTodayData(today) {
    const [result] = await db.query("SELECT data FROM gold_prices WHERE DATE(date) = ? ORDER BY date DESC LIMIT 1", [today]);
    
    if (result.length === 0) return null;
    return processRawData(result[0].data);
}

// �� دریافت کل داده‌های ذخیره‌شده (با `pagination`)
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
    const [results] = await db.query(dataQuery, [limit, offset]);
    
    return { 
        data: results.map(row => processRawData(row.data)), 
        totalRecords 
    };
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
    
    return { 
        data: results.map(row => processRawData(row.data)), 
        totalRecords 
    };
}

module.exports = {
    getTodayData,
    getAllData,
    getDataInRange,
};
