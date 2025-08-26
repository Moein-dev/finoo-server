const express = require("express");
const path = require("path");
const { 
    securityHeaders, 
    corsHeaders, 
    developmentHeaders 
} = require("./middlewares/securityHeaders");
const { sendErrorResponse } = require("./utils/responseHandler");

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

const app = express();

// 📌 Security Headers - Apply first for all requests
app.use(securityHeaders());
app.use(corsHeaders());
app.use(developmentHeaders());

// 📌 ارائه فایل‌های استاتیک از پوشه public/icons
app.use("/icons", express.static(path.join(__dirname, "public/icons")));  // تنظیمات مسیر آیکن‌ها

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 📌 پشتیبانی از فرم-urlencoded

// 📌 استفاده از `authRoutes`
if (authRoutes) {
    app.use("/api/auth", authRoutes);
} else {
    console.error("⚠️ Skipping authRoutes. Route not available.");
}

// 📌 استفاده از `dataRoutes`
if (dataRoutes) {
    app.use("/api", dataRoutes);
} else {
    console.error("⚠️ Skipping dataRoutes. Route not available.");
}

// 📌 مسیر تست برای بررسی وضعیت سرور
app.get("/", (req, res) => {
    const { sendSuccessResponse } = require("./utils/responseHandler");
    return sendSuccessResponse(res, { message: "🚀 Finoo API is running..." });
});

// 📌 مدیریت مسیرهای نامعتبر (404 Not Found)
app.use((req, res) => {
    return sendErrorResponse(res, 404, "Route not found");
});

// 📌 مدیریت خطاهای عمومی (Error Handling Middleware)
app.use((err, req, res, next) => {
    console.error("❌ Internal Server Error:", err);
    return sendErrorResponse(res, 500, "Internal Server Error");
});

const port = process.env.PORT || 3000;

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
    });
}

module.exports = app;
