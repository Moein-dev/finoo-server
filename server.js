require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { setupScheduledFetching, initialize: initializeDataFetch } = require("./services/dataFetchService");
const logger = require("./utils/logger");

const app = express();
const port = process.env.PORT || 3000;

// بررسی مقدار PORT
if (!process.env.PORT) {
    logger.warn("⚠️ Warning: PORT is not set in environment variables. Using default: 3000");
}

// بررسی مقدار SECRET_KEY و REFRESH_SECRET
if (!process.env.SECRET_KEY) {
    logger.error("❌ Error: SECRET_KEY is missing in environment variables.");
    process.exit(1);
}

if (!process.env.REFRESH_SECRET_KEY) {
    logger.error("❌ Error: REFRESH_SECRET is missing in environment variables.");
    process.exit(1);
}

let dataRoutes, authRoutes;

// بررسی dataRoutes
try {
    dataRoutes = require("./routes/dataRoutes");
} catch (error) {
    logger.error("❌ Critical Error: Failed to load dataRoutes.js:", { error: error.message });
    process.exit(1);
}

// بررسی authRoutes
try {
    authRoutes = require("./routes/authRoutes");
} catch (error) {
    logger.error("❌ Critical Error: Failed to load authRoutes.js:", { error: error.message });
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: "Too many requests from this IP, please try again later.",
    handler: (req, res, next, options) => {
        logger.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});
app.use(limiter);

// ثبت مسیرها
app.use("/api", dataRoutes);
app.use("/api/auth", authRoutes);

// Root route
app.get("/", (req, res) => {
    res.send("🚀 Finoo API is running...");
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: 404, error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error("❌ Internal Server Error:", { error: err.message, stack: err.stack });
    res.status(500).json({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
    });
});

// Start server
const startServer = async () => {
    try {
        // Initialize data fetch service
        await initializeDataFetch();
        
        // Set up scheduled data fetching
        setupScheduledFetching();
        
        app.listen(port, () => {
            logger.info(`🚀 Server running on http://localhost:${port}/`);
        });
    } catch (error) {
        logger.error("❌ Error initializing data services:", { error: error.message });
        process.exit(1);
    }
};

startServer();