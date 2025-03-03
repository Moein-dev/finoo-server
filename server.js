require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./middleware/authMiddleware');
const priceJobs = require('./jobs/priceJobs');
const db = require("./config/db");
const { setupScheduledFetching, initialize: initializeDataFetch } = require("./services/dataFetchService");

const app = express();
const port = process.env.PORT || 3000;

let dataRoutes, authRoutes;

try {
    dataRoutes = require("./routes/dataRoutes");
} catch (error) {
    console.error("❌ Error loading dataRoutes.js:", error.message);
    dataRoutes = null;
}

try {
    authRoutes = require("./routes/authRoutes");
} catch (error) {
    console.error("❌ Error loading authRoutes.js:", error.message);
    authRoutes = null;
}

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Use other routes if available
if (dataRoutes) {
    app.use("/api", dataRoutes);
} else {
    console.error("⚠️ Skipping dataRoutes. Route not available.");
}

if (authRoutes) {
    app.use("/api/auth", authRoutes);
} else {
    console.error("⚠️ Skipping authRoutes. Route not available.");
}

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
    console.error("❌ Internal Server Error:", err);
    res.status(500).json({ status: 500, error: "Internal Server Error" });
});

// Start server
const startServer = async () => {
    try {
        // Initialize data fetch service
        await initializeDataFetch();
        
        // Set up scheduled data fetching
        setupScheduledFetching();
        
        app.listen(port, () => {
            console.log(`🚀 Server running on port ${port}`);
        });
    } catch (error) {
        console.error("❌ Error initializing data services:", error);
        process.exit(1);
    }
};

startServer();
