const request = require('supertest');
const express = require('express');
const dataRoutes = require('../routes/dataRoutes');
const { 
    getTodayData, getAllData, getDataInRange, getSymbolsList,
    getLatestPrice, getHourlyPriceHistory, getAllHourlyData,
    getChartData, getDailyDataForSymbol
} = require('../services/databaseService');
const dataFetchService = require('../services/dataFetchService');

// Mock environment variables for testing
process.env.PORT = '3000';
process.env.SECRET_KEY = 'test-secret-key';
process.env.REFRESH_SECRET_KEY = 'test-refresh-secret-key';

// Mock console methods to suppress output during tests
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
};

beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
});

// Mock the database service
jest.mock('../services/databaseService');
jest.mock('../services/dataFetchService');
jest.mock('../middleware/authMiddleware', () => {
    return (req, res, next) => {
        req.user = { id: 1 };
        next();
    };
});

// Mock the database connection
jest.mock('../config/db', () => {
    return {
        pool: {
            getConnection: jest.fn().mockResolvedValue({
                query: jest.fn(),
                release: jest.fn()
            })
        }
    };
});

describe('Data Routes', () => {
    let app;
    let mockToken;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api', dataRoutes);
        
        // Mock token for testing
        mockToken = 'mock-token';
    });

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        // Reset console mocks
        console.log.mockClear();
        console.warn.mockClear();
        console.error.mockClear();
    });

    describe('GET /api/data', () => {
        it('should return data when cache is available', async () => {
            const mockData = {
                data: {
                    prices: [{ price: 100, symbol: 'TEST' }],
                    categories: { TEST: [{ price: 100, symbol: 'TEST' }] }
                },
                meta: { timestamp: new Date() }
            };

            dataFetchService.getCachedData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/data')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(dataFetchService.getCachedData).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('🔄 Processing request for route: GET /data');
        });

        it('should fallback to direct database fetch when cache fails', async () => {
            const mockData = {
                data: {
                    prices: [{ price: 100, symbol: 'TEST' }],
                    categories: { TEST: [{ price: 100, symbol: 'TEST' }] }
                },
                meta: { timestamp: new Date() }
            };

            dataFetchService.getCachedData.mockRejectedValue(new Error('Cache failed'));
            getTodayData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/data')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(getTodayData).toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith(
                '⚠️ Cache fetch failed, falling back to direct database fetch:',
                expect.any(Error)
            );
        });

        it('should return 404 when no data is found', async () => {
            dataFetchService.getCachedData.mockResolvedValue(null);
            getTodayData.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/data')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No data found for today');
        });
    });

    describe('GET /api/symbols', () => {
        it('should return categorized symbols', async () => {
            const mockSymbols = [
                { symbol: 'TEST1', name: 'Test 1', category: 'CAT1' },
                { symbol: 'TEST2', name: 'Test 2', category: 'CAT1' },
                { symbol: 'TEST3', name: 'Test 3', category: 'CAT2' }
            ];

            getSymbolsList.mockResolvedValue(mockSymbols);

            const response = await request(app)
                .get('/api/symbols')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.CAT1).toHaveLength(2);
            expect(response.body.data.CAT2).toHaveLength(1);
            expect(console.log).toHaveBeenCalledWith('🔄 Processing request for route: GET /symbols');
        });

        it('should return 404 when no symbols are found', async () => {
            getSymbolsList.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/symbols')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No symbols found');
        });
    });

    describe('GET /api/all-data', () => {
        it('should return paginated data', async () => {
            const mockData = {
                data: [
                    {
                        data: {
                            prices: [{ price: 100, symbol: 'TEST' }],
                            categories: { TEST: [{ price: 100, symbol: 'TEST' }] }
                        },
                        meta: { timestamp: new Date() }
                    }
                ],
                totalRecords: 1
            };

            getAllData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/all-data')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.totalRecords).toBe(1);
            expect(console.log).toHaveBeenCalledWith('🔄 Processing request for route: GET /all-data');
        });

        it('should handle invalid pagination parameters', async () => {
            const mockData = {
                data: [],
                totalRecords: 0
            };

            getAllData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/all-data?page=invalid&limit=invalid')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.currentPage).toBe(1);
            expect(response.body.meta.limitPerPage).toBe(10);
            expect(getAllData).toHaveBeenCalledWith(10, 0); // Default values
        });
    });

    describe('GET /api/data/range', () => {
        it('should return data within date range', async () => {
            const mockData = {
                data: [
                    {
                        data: {
                            prices: [{ price: 100, symbol: 'TEST' }],
                            categories: { TEST: [{ price: 100, symbol: 'TEST' }] }
                        },
                        meta: { timestamp: new Date() }
                    }
                ],
                totalRecords: 1
            };

            getDataInRange.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/data/range?start=2024-01-01&end=2024-01-02')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.totalRecords).toBe(1);
            expect(console.log).toHaveBeenCalledWith('🔄 Processing request for route: GET /data/range');
        });

        it('should return 400 when start or end date is missing', async () => {
            const response = await request(app)
                .get('/api/data/range')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Start and end dates are required');
            expect(console.error).toHaveBeenCalledWith('❌ Error 400:', 'Start and end dates are required');
        });

        it('should handle invalid date formats', async () => {
            const response = await request(app)
                .get('/api/data/range?start=invalid&end=invalid')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Start and end dates are required');
            expect(console.error).toHaveBeenCalledWith('❌ Error 400:', 'Start and end dates are required');
            expect(getDataInRange).not.toHaveBeenCalled();
        });
    });

    describe('GET /api/latest-prices', () => {
        it('should return latest prices for all symbols', async () => {
            const mockData = [
                { symbol: 'TEST1', price: 100, category: 'CAT1' },
                { symbol: 'TEST2', price: 200, category: 'CAT2' }
            ];

            getLatestPrice.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/latest-prices')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.categories).toHaveLength(2);
        });

        it('should return latest prices for a specific category', async () => {
            const mockData = [
                { symbol: 'TEST1', price: 100, category: 'CAT1' },
                { symbol: 'TEST2', price: 200, category: 'CAT1' }
            ];

            getLatestPrice.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/latest-prices?category=CAT1')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.categories).toEqual(['CAT1']);
        });

        it('should return 404 when no prices are found', async () => {
            getLatestPrice.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/latest-prices')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No latest prices found');
        });
    });

    describe('GET /api/hourly/:symbol', () => {
        beforeEach(() => {
            getHourlyPriceHistory.mockClear();
        });

        it('should return hourly price history for a symbol', async () => {
            const mockData = [
                { price: 100, timestamp: new Date() },
                { price: 200, timestamp: new Date() }
            ];

            getHourlyPriceHistory.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/hourly/TEST')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.symbol).toBe('TEST');
            expect(getHourlyPriceHistory).toHaveBeenCalledWith('TEST', 24);
        });

        it('should handle custom hours parameter', async () => {
            const mockData = [
                { price: 100, timestamp: new Date() }
            ];

            getHourlyPriceHistory.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/hourly/TEST?hours=48')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.meta.hoursRequested).toBe(48);
            expect(getHourlyPriceHistory).toHaveBeenCalledWith('TEST', 48);
        });

        it('should return 400 when symbol is missing', async () => {
            const response = await request(app)
                .get('/api/hourly/')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Symbol parameter is required');
            expect(getHourlyPriceHistory).not.toHaveBeenCalled();
        });

        it('should return 404 when no data is found', async () => {
            getHourlyPriceHistory.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/hourly/TEST')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No hourly data found for symbol TEST');
            expect(getHourlyPriceHistory).toHaveBeenCalledWith('TEST', 24);
        });
    });

    describe('GET /api/hourly-data', () => {
        beforeEach(() => {
            getAllHourlyData.mockClear();
        });

        it('should return hourly data for all symbols', async () => {
            const mockData = {
                data: [
                    { symbol: 'TEST1', price: 100, timestamp: new Date() },
                    { symbol: 'TEST2', price: 200, timestamp: new Date() }
                ],
                totalCount: 2
            };

            getAllHourlyData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/hourly-data')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.totalRecords).toBe(2);
            expect(getAllHourlyData).toHaveBeenCalledWith({
                startTime: 24,
                endTime: expect.any(Date),
                category: null,
                limit: 1000,
                offset: 0
            });
        });

        it('should handle date range parameters', async () => {
            const mockData = {
                data: [{ symbol: 'TEST', price: 100, timestamp: new Date() }],
                totalCount: 1
            };

            getAllHourlyData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/hourly-data?start=2024-01-01&end=2024-01-02')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.timeRange).toBeDefined();
            expect(getAllHourlyData).toHaveBeenCalledWith({
                startTime: expect.any(Date),
                endTime: expect.any(Date),
                category: null,
                limit: 1000,
                offset: 0
            });
        });

        it('should handle category filter', async () => {
            const mockData = {
                data: [{ symbol: 'TEST', category: 'CAT1', price: 100, timestamp: new Date() }],
                totalCount: 1
            };

            getAllHourlyData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/hourly-data?category=CAT1')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.categories).toEqual(['CAT1']);
            expect(getAllHourlyData).toHaveBeenCalledWith({
                startTime: 24,
                endTime: expect.any(Date),
                category: 'CAT1',
                limit: 1000,
                offset: 0
            });
        });

        it('should return 404 when no data is found', async () => {
            getAllHourlyData.mockResolvedValue({ data: [], totalCount: 0 });

            const response = await request(app)
                .get('/api/hourly-data')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No hourly data found for the specified criteria');
            expect(getAllHourlyData).toHaveBeenCalled();
        });

        it('should handle invalid start time format', async () => {
            const response = await request(app)
                .get('/api/hourly-data?start=invalid')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid start time format. Use ISO datetime or hours (e.g., 24 for last 24 hours)');
            expect(getAllHourlyData).not.toHaveBeenCalled();
        });

        it('should handle invalid end time format', async () => {
            const response = await request(app)
                .get('/api/hourly-data?end=invalid')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid end time format. Use ISO datetime');
            expect(getAllHourlyData).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            getAllHourlyData.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/hourly-data')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
            expect(getAllHourlyData).toHaveBeenCalled();
        });
    });

    describe('GET /api/today/:category', () => {
        beforeEach(() => {
            getAllHourlyData.mockClear();
        });

        it('should return today\'s data for a category', async () => {
            const mockData = {
                data: [
                    { symbol: 'TEST1', category: 'CAT1', price: 100, timestamp: new Date() },
                    { symbol: 'TEST2', category: 'CAT1', price: 200, timestamp: new Date() }
                ],
                totalCount: 2
            };

            getAllHourlyData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/today/CAT1')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.meta.category).toBe('CAT1');
            expect(response.body.meta.totalSymbols).toBe(2);
            expect(getAllHourlyData).toHaveBeenCalledWith({
                startTime: 24,
                category: 'CAT1',
                limit: 1000
            });
        });

        it('should return 400 when category is missing', async () => {
            const response = await request(app)
                .get('/api/today/')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Category parameter is required');
            expect(getAllHourlyData).not.toHaveBeenCalled();
        });

        it('should return 404 when no data is found', async () => {
            getAllHourlyData.mockResolvedValue({ data: [], totalCount: 0 });

            const response = await request(app)
                .get('/api/today/CAT1')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No hourly data found for category: CAT1');
            expect(getAllHourlyData).toHaveBeenCalledWith({
                startTime: 24,
                category: 'CAT1',
                limit: 1000
            });
        });

        it('should handle database errors', async () => {
            getAllHourlyData.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/today/CAT1')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
            expect(getAllHourlyData).toHaveBeenCalledWith({
                startTime: 24,
                category: 'CAT1',
                limit: 1000
            });
        });
    });

    describe('GET /api/chart', () => {
        it('should return chart data for specified symbols', async () => {
            const mockData = [
                { symbol: 'TEST1', prices: [100, 200] },
                { symbol: 'TEST2', prices: [300, 400] }
            ];

            getChartData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/chart?symbols=TEST1,TEST2')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.symbols).toEqual(['TEST1', 'TEST2']);
        });

        it('should handle custom hours and interval parameters', async () => {
            const mockData = [{ symbol: 'TEST', prices: [100] }];

            getChartData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/chart?symbols=TEST&hours=48&interval=4hour')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.meta.hours).toBe(48);
            expect(response.body.meta.interval).toBe('4hour');
        });

        it('should return 400 when no symbols are specified', async () => {
            const response = await request(app)
                .get('/api/chart')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('At least one symbol must be specified');
        });

        it('should return 400 for invalid interval', async () => {
            const response = await request(app)
                .get('/api/chart?symbols=TEST&interval=invalid')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid interval. Use one of: hour, 4hour, day');
        });
    });

    describe('GET /api/daily/:symbol', () => {
        beforeEach(() => {
            getDailyDataForSymbol.mockClear();
        });

        it('should return daily data for a symbol', async () => {
            const mockData = [
                { price: 100, timestamp: new Date() },
                { price: 200, timestamp: new Date() }
            ];

            getDailyDataForSymbol.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/daily/TEST')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.data).toHaveLength(2);
            expect(getDailyDataForSymbol).toHaveBeenCalledWith('TEST', 1);
        });

        it('should handle custom days parameter', async () => {
            const mockData = [{ price: 100, timestamp: new Date() }];

            getDailyDataForSymbol.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/daily/TEST?days=7')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(getDailyDataForSymbol).toHaveBeenCalledWith('TEST', 7);
        });

        it('should return 400 when symbol is missing', async () => {
            const response = await request(app)
                .get('/api/daily/')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Symbol is required');
            expect(getDailyDataForSymbol).not.toHaveBeenCalled();
        });

        it('should return 404 when no data is found', async () => {
            getDailyDataForSymbol.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/daily/TEST')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No daily data found for this symbol');
            expect(getDailyDataForSymbol).toHaveBeenCalledWith('TEST', 1);
        });
    });
}); 