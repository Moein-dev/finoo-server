const { pool } = require('../config/db');

// Job to fetch and store hourly prices
async function storeHourlyPrices(prices, sourceId, fetchId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const insertQuery = `
            INSERT INTO hourly_prices (symbol, category_id, name, price, unit, timestamp, fetch_id, source_id)
            VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
        `;

        for (const price of prices) {
            await connection.query(insertQuery, [
                price.symbol,
                price.category_id,
                price.name,
                price.price,
                price.unit,
                fetchId,
                sourceId
            ]);
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        console.error('Error storing hourly prices:', error);
        return false;
    } finally {
        connection.release();
    }
}

// Job to record fetch statistics
async function recordFetchStats(stats) {
    try {
        const query = `
            INSERT INTO fetch_stats 
            (trigger_type, success, duration_ms, sources_total, sources_success, records_stored, source_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await pool.query(query, [
            stats.trigger_type,
            stats.success,
            stats.duration_ms,
            stats.sources_total,
            stats.sources_success,
            stats.records_stored,
            stats.source_id
        ]);
        return true;
    } catch (error) {
        console.error('Error recording fetch stats:', error);
        return false;
    }
}

// Job to clean up old price data
async function cleanupOldPrices(daysToKeep = 30) {
    try {
        const query = `
            DELETE FROM hourly_prices 
            WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const [result] = await pool.query(query, [daysToKeep]);
        return result.affectedRows;
    } catch (error) {
        console.error('Error cleaning up old prices:', error);
        return 0;
    }
}

// Job to get active data sources
async function getActiveDataSources() {
    try {
        const [sources] = await pool.query(`
            SELECT ds.*, c.name as category_name 
            FROM data_sources ds
            JOIN categories c ON ds.category_id = c.id
            WHERE ds.active = true
            ORDER BY ds.priority ASC
        `);
        return sources;
    } catch (error) {
        console.error('Error fetching active data sources:', error);
        return [];
    }
}

// Job to get latest prices by category
async function getLatestPricesByCategory(category = null) {
    try {
        let query = `
            SELECT hp.*, c.name as category_name
            FROM latest_prices hp
            JOIN categories c ON hp.category_id = c.id
        `;
        
        const params = [];
        if (category) {
            query += ' WHERE c.name = ?';
            params.push(category);
        }
        
        query += ' ORDER BY hp.symbol ASC';
        
        const [prices] = await pool.query(query, params);
        return prices;
    } catch (error) {
        console.error('Error fetching latest prices:', error);
        return [];
    }
}

// Job to get hourly price history
async function getHourlyPriceHistory(symbol, hours = 24) {
    try {
        const query = `
            SELECT hp.*, c.name as category_name
            FROM hourly_prices hp
            JOIN categories c ON hp.category_id = c.id
            WHERE hp.symbol = ?
            AND hp.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY hp.timestamp DESC
        `;
        const [prices] = await pool.query(query, [symbol, hours]);
        return prices;
    } catch (error) {
        console.error('Error fetching hourly price history:', error);
        return [];
    }
}

module.exports = {
    storeHourlyPrices,
    recordFetchStats,
    cleanupOldPrices,
    getActiveDataSources,
    getLatestPricesByCategory,
    getHourlyPriceHistory
}; 