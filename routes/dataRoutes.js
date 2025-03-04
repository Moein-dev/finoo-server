const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const { 
    getTodayData, getAllData, getDataInRange,
    getSymbolsList, getDailyDataForSymbol, getHourlyPriceHistory,
    getAllHourlyData, getChartData, getLatestPrice
} = require("../services/databaseService");
const dataFetchService = require("../services/dataFetchService");
const { query, validationResult } = require('express-validator');
const logger = require("../utils/logger");

const router = express.Router();

// Log available functions for debugging
logger.debug("🔍 Checking functions used in router:", {
    functions: {
        getTodayData: typeof getTodayData,
        getAllData: typeof getAllData,
        getDataInRange: typeof getDataInRange,
        getSymbolsList: typeof getSymbolsList,
        getDailyDataForSymbol: typeof getDailyDataForSymbol,
        getHourlyPriceHistory: typeof getHourlyPriceHistory,
        getAllHourlyData: typeof getAllHourlyData,
        getChartData: typeof getChartData,
        getLatestPrice: typeof getLatestPrice,
        verifyToken: typeof verifyToken
    }
});

// 📌 Default data format options
const DEFAULT_DATA_FORMAT = 'categorized'; // 'categorized' or 'flat'

// Cache TTL values (in milliseconds)
const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 3 * 60 * 60 * 1000,  // 3 hours
  VERY_LONG: 24 * 60 * 60 * 1000 // 24 hours
};

// Helper function to format response based on format parameter
function formatResponse(data, format = DEFAULT_DATA_FORMAT) {
  if (!data || !data.data) return data;
  
  // Return the data in the requested format
  if (format === 'flat' && data.data.prices) {
    // Return only the flat array of prices
    return {
      data: data.data.prices,
      meta: data.meta
    };
  } else if (format === 'categorized' && data.data.categories) {
    // Return the categorized data structure
    return {
      data: data.data.categories,
      meta: data.meta
    };
  }
  
  // Default: return the full data structure
  return data;
}

// 📌 Get today's data (with caching for better performance)
router.get("/data", verifyToken, [
    query('format').optional().isIn(['categorized', 'flat']).withMessage('Invalid format'),
    query('fresh').optional().isBoolean().withMessage('Invalid fresh value')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /data');
        const { format = DEFAULT_DATA_FORMAT, fresh = false } = req.query;
        
        // If fresh=true is specified, bypass cache and fetch from database
        // Otherwise use cached data with SHORT TTL
        let data;
        if (fresh === 'true') {
            const today = new Date().toISOString().split("T")[0];
            data = await getTodayData(today);
        } else {
            try {
                // Use cached data with a short TTL (5 minutes)
                data = await dataFetchService.getCachedData(CACHE_TTL.SHORT);
            } catch (error) {
                logger.warn('⚠️ Cache fetch failed, falling back to direct database fetch:', { error: error.message });
                const today = new Date().toISOString().split("T")[0];
                data = await getTodayData(today);
            }
        }

        if (!data) return sendErrorResponse(res, 404, "No data found for today");

        // Format the response based on the requested format
        const formattedData = formatResponse(data, format);

        return sendSuccessResponse(res, formattedData.data, {
            self: `${req.protocol}://${req.get("host")}/api/data?format=${format}&fresh=${fresh}`,
        }, {
            ...formattedData.meta,
            cached: fresh !== 'true'
        });
    } catch (error) {
        logger.error('Error in /data:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching data.');
    }
});

// 📌 Get all saved data with pagination
router.get("/all-data", verifyToken, [
    query('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Invalid limit'),
    query('format').optional().isIn(['categorized', 'flat']).withMessage('Invalid format')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /all-data');
        let { page = 1, limit = 10, format = DEFAULT_DATA_FORMAT } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;
        const { data, totalRecords } = await getAllData(limit, offset);

        // Format each data entry based on the requested format
        const formattedData = data.map(entry => formatResponse(entry, format));
        const totalPages = Math.ceil(totalRecords / limit);

        return sendSuccessResponse(res, formattedData, {
            self: `${req.protocol}://${req.get("host")}/api/all-data?page=${page}&limit=${limit}&format=${format}`,
        }, {
            totalRecords,
            totalPages,
            currentPage: page,
            limitPerPage: limit,
        });
    } catch (error) {
        logger.error('Error in /all-data:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching all data.');
    }
});

// 📌 Get data within date range with pagination
router.get("/data/range", verifyToken, [
    query('start').notEmpty().withMessage('Start date is required').isISO8601().withMessage('Invalid start date format'),
    query('end').notEmpty().withMessage('End date is required').isISO8601().withMessage('Invalid end date format'),
    query('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Invalid limit'),
    query('format').optional().isIn(['categorized', 'flat']).withMessage('Invalid format')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /data/range');
        let { start, end, page = 1, limit = 10, format = DEFAULT_DATA_FORMAT } = req.query;
        
        // Validate required parameters
        if (!start || !end) return sendErrorResponse(res, 400, "Start and end dates are required");
        
        // Validate date formats
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return sendErrorResponse(res, 400, "Start and end dates are required");
        }

        page = parseInt(page);
        limit = parseInt(limit);
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;
        const { data, totalRecords } = await getDataInRange(start, end, limit, offset);

        if (data.length === 0) return sendErrorResponse(res, 404, "No data found in the given range");

        // Format each data entry based on the requested format
        const formattedData = data.map(entry => formatResponse(entry, format));
        const totalPages = Math.ceil(totalRecords / limit);

        return sendSuccessResponse(res, formattedData, {
            self: `${req.protocol}://${req.get("host")}/api/data/range?start=${start}&end=${end}&page=${page}&limit=${limit}&format=${format}`,
        }, {
            totalRecords,
            totalPages,
            currentPage: page,
            limitPerPage: limit,
        });
    } catch (error) {
        logger.error('Error in /data/range:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching data in range.');
    }
});

// 📌 Get today's latest prices for all symbols
router.get("/latest-prices", verifyToken, [
    query('category').optional().isString().withMessage('Invalid category')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /latest-prices');
        const { category } = req.query;
        let data;

        if (category) {
            data = await getLatestPrice(category);
        } else {
            data = await getLatestPrice();
        }

        if (!data || data.length === 0) {
            return sendErrorResponse(res, 404, "No latest prices found");
        }

        return sendSuccessResponse(res, data, {
            self: `${req.protocol}://${req.get("host")}/api/latest-prices${category ? `?category=${category}` : ''}`,
        }, {
            timestamp: new Date(),
            count: data.length,
            categories: [...new Set(data.map(item => item.category))]
        });
    } catch (error) {
        logger.error('Error in /latest-prices:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching latest prices.');
    }
});

// 📌 Get hourly price history for a specific symbol
router.get("/hourly/:symbol", verifyToken, [
    query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Invalid hours value')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /hourly/:symbol');
        const { symbol } = req.params;
        
        if (!symbol || symbol.trim() === '') {
            return sendErrorResponse(res, 400, "Symbol parameter is required");
        }
        
        let { hours = 24 } = req.query;
        hours = parseInt(hours);
        if (isNaN(hours) || hours < 1) hours = 24;
        if (hours > 168) hours = 168;
        
        const data = await getHourlyPriceHistory(symbol, hours);
        
        if (!data || data.length === 0) {
            return sendErrorResponse(res, 404, `No hourly data found for symbol ${symbol}`);
        }
        
        return sendSuccessResponse(res, data, {
            self: `${req.protocol}://${req.get("host")}/api/hourly/${symbol}?hours=${hours}`,
        }, {
            symbol: symbol,
            hoursRequested: hours,
            dataPoints: data.length,
            timespan: {
                from: data[0]?.timestamp,
                to: data[data.length - 1]?.timestamp
            }
        });
    } catch (error) {
        logger.error('Error in /hourly/:symbol:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching hourly data.');
    }
});

// 📌 دریافت لیست `symbols` از دیتابیس
router.get("/symbols", verifyToken, async (req, res) => {
    try {
        const data = await getSymbolsList();
        
        if (!data || data.length === 0) {
            return sendErrorResponse(res, 404, "No symbols found");
        }

        // داده‌ها را به‌صورت دسته‌بندی‌شده برگردانیم
        const categorizedSymbols = {};
        data.forEach(row => {
            if (!categorizedSymbols[row.category]) {
                categorizedSymbols[row.category] = [];
            }
            categorizedSymbols[row.category].push({
                symbol: row.symbol,
                name: row.name
            });
        });

        return sendSuccessResponse(res, categorizedSymbols, {
            self: `${req.protocol}://${req.get("host")}/api/symbols`,
        }, {
            timestamp: new Date(),
            totalSymbols: data.length,
            categories: Object.keys(categorizedSymbols)
        });

    } catch (error) {
        logger.error("❌ Error fetching available symbols:", { error: error.message });
        return sendErrorResponse(res, 500, "Error retrieving available symbols.");
    }
});

// 📌 Get hourly data for all symbols within a date range
router.get("/hourly-data", verifyToken, [
    query('start').optional().isISO8601().withMessage('Invalid start time format'),
    query('end').optional().isISO8601().withMessage('Invalid end time format'),
    query('category').optional().isString().withMessage('Invalid category'),
    query('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Invalid limit')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /hourly-data');
        const { 
            start = 24, // Default to last 24 hours
            end = null, 
            category = null,
            page = 1,
            limit = 1000
        } = req.query;
        
        // Parse and validate parameters
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);
        const offset = (parsedPage - 1) * parsedLimit;
        
        // Format start time
        let startTime = start;
        if (start.includes('-') || start.includes(':')) {
            // Use as ISO datetime
            startTime = new Date(start);
            if (isNaN(startTime.getTime())) {
                return sendErrorResponse(res, 400, "Invalid start time format. Use ISO datetime or hours (e.g., 24 for last 24 hours)");
            }
        } else {
            // Use as hours
            startTime = parseInt(start);
            if (isNaN(startTime)) {
                return sendErrorResponse(res, 400, "Invalid start time format. Use ISO datetime or hours (e.g., 24 for last 24 hours)");
            }
        }
        
        // Format end time
        let endTime = end ? new Date(end) : new Date();
        if (end && isNaN(endTime.getTime())) {
            return sendErrorResponse(res, 400, "Invalid end time format. Use ISO datetime");
        }
        
        // Get the hourly data with the specified parameters
        const result = await getAllHourlyData({
            startTime,
            endTime,
            category,
            limit: parsedLimit,
            offset
        });
        
        if (!result || !result.data || result.data.length === 0) {
            return sendErrorResponse(res, 404, "No hourly data found for the specified criteria");
        }
        
        // Calculate total pages
        const totalPages = Math.ceil(result.totalCount / parsedLimit);
        
        // Get unique symbols and categories in the result
        const symbols = [...new Set(result.data.map(item => item.symbol))];
        const categories = [...new Set(result.data.map(item => item.category))];
        
        return sendSuccessResponse(res, result.data, {
            self: `${req.protocol}://${req.get("host")}/api/hourly-data?start=${start}&page=${page}&limit=${limit}${category ? `&category=${category}` : ''}`,
            prev: parsedPage > 1 ? `${req.protocol}://${req.get("host")}/api/hourly-data?start=${start}&page=${parsedPage - 1}&limit=${limit}${category ? `&category=${category}` : ''}` : null,
            next: parsedPage < totalPages ? `${req.protocol}://${req.get("host")}/api/hourly-data?start=${start}&page=${parsedPage + 1}&limit=${limit}${category ? `&category=${category}` : ''}` : null
        }, {
            totalRecords: result.totalCount,
            totalPages,
            currentPage: parsedPage,
            limitPerPage: parsedLimit,
            symbols,
            categories,
            timeRange: {
                from: typeof startTime === 'number' ? `${startTime} hours ago` : startTime,
                to: endTime
            }
        });
    } catch (error) {
        logger.error('Error in /hourly-data:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching hourly data.');
    }
});

// 📌 Get last 24 hours of data for a specific category
router.get("/today/:category", verifyToken, async (req, res, next) => {
    try {
        logger.info('🔄 Processing request for route: GET /today/:category');
        const { category } = req.params;
        
        if (!category || category.trim() === '') {
            return sendErrorResponse(res, 400, "Category parameter is required");
        }
        
        // دریافت داده‌های ۲۴ ساعت گذشته برای یک دسته خاص
        const result = await getAllHourlyData({
            startTime: 24, // داده‌های ۲۴ ساعت اخیر
            category: category,
            limit: 1000 // بالاترین حد برای دریافت همه داده‌ها
        });
        
        if (!result || !result.data || result.data.length === 0) {
            return sendErrorResponse(res, 404, `No hourly data found for category: ${category}`);
        }

        // داده‌ها را بر اساس نماد گروه‌بندی کنیم
        const groupedBySymbol = {};
        result.data.forEach(item => {
            if (!groupedBySymbol[item.symbol]) {
                groupedBySymbol[item.symbol] = {
                    symbol: item.symbol,
                    category: item.category,
                    unit: item.unit,
                    data: []
                };
            }

            groupedBySymbol[item.symbol].data.push({
                price: item.price,
                timestamp: item.timestamp
            });
        });

        return sendSuccessResponse(res, Object.values(groupedBySymbol), {
            self: `${req.protocol}://${req.get("host")}/api/today/${category}`,
        }, {
            category,
            totalSymbols: Object.keys(groupedBySymbol).length,
            totalDataPoints: result.data.length,
            timeRange: {
                from: new Date(Date.now() - 24 * 60 * 60 * 1000),
                to: new Date()
            }
        });
    } catch (error) {
        logger.error('Error in /today/:category:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching today data.');
    }
});

// 📌 Get chart data for specified symbols
router.get("/chart", verifyToken, [
    query('symbols').notEmpty().withMessage('At least one symbol must be specified'),
    query('hours').optional().isInt({ min: 1 }).withMessage('Invalid hours value'),
    query('interval').optional().isIn(['hour', '4hour', 'day']).withMessage('Invalid interval')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /chart');
        const { symbols, hours = 24, interval = 'hour' } = req.query;
        
        if (!symbols) {
            return sendErrorResponse(res, 400, "At least one symbol must be specified");
        }
        
        let symbolsArray = [];
        if (typeof symbols === 'string') {
            symbolsArray = symbols.split(',').map(s => s.trim());
        } else if (Array.isArray(symbols)) {
            symbolsArray = symbols;
        } else {
            return sendErrorResponse(res, 400, "Invalid symbols format. Use comma-separated list or array");
        }
        
        const validIntervals = ['hour', '4hour', 'day'];
        if (!validIntervals.includes(interval)) {
            return sendErrorResponse(res, 400, `Invalid interval. Use one of: ${validIntervals.join(', ')}`);
        }
        
        const chartData = await getChartData({
            symbols: symbolsArray,
            hours: parseInt(hours),
            interval
        });
        
        return sendSuccessResponse(res, chartData, {
            self: `${req.protocol}://${req.get("host")}/api/chart?symbols=${symbolsArray.join(',')}&hours=${hours}&interval=${interval}`,
        }, {
            symbols: symbolsArray,
            hours: parseInt(hours),
            interval,
            generated: new Date()
        });
    } catch (error) {
        logger.error('Error in /chart:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching chart data.');
    }
});

// 📌 دریافت داده‌های روزانه برای یک symbol خاص
router.get("/daily/:symbol", verifyToken, [
    query('days').optional().isInt({ min: 1 }).withMessage('Invalid days value')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(res, 400, errors.array().map(err => err.msg).join(', '));
    }

    try {
        logger.info('🔄 Processing request for route: GET /daily/:symbol');
        const { symbol } = req.params;
        
        if (!symbol || symbol.trim() === '') {
            return sendErrorResponse(res, 400, "Symbol is required");
        }

        const { days = 1 } = req.query;
        const data = await getDailyDataForSymbol(symbol, parseInt(days));
        
        if (!data || data.length === 0) {
            return sendErrorResponse(res, 404, "No daily data found for this symbol");
        }

        return sendSuccessResponse(res, data, {
            self: `${req.protocol}://${req.get("host")}/api/daily/${symbol}?days=${days}`,
        });
    } catch (error) {
        logger.error('Error in /daily/:symbol:', { error: error.message });
        return sendErrorResponse(res, 500, 'An error occurred while fetching daily data.');
    }
});

module.exports = router;
