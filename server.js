const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const path = require("path");

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

// 📌 ارائه فایل‌های استاتیک از پوشه public/icons
app.use("/icons", express.static(path.join(__dirname, "public/icons")));  // تنظیمات مسیر آیکن‌ها


app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 📌 پشتیبانی از فرم-urlencoded
app.use(cors({ origin: "https://finoo.ir", methods: ["GET", "POST"] }));

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
    res.send("🚀 Finoo API is running...");
});

// 📌 مدیریت مسیرهای نامعتبر (404 Not Found)
app.use((req, res) => {
    res.status(404).json({ status: 404, error: "Route not found" });
});

// 📌 مدیریت خطاهای عمومی (Error Handling Middleware)
app.use((err, req, res, next) => {
    console.error("❌ Internal Server Error:", err);
    res.status(500).json({ status: 500, error: "Internal Server Error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
