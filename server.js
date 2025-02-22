const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const dataRoutes = require("./routes/dataRoutes");
const authRoutes = require("./routes/authRoutes"); // بررسی کن که این فایل وجود داشته باشد!

let fetchPrices;
try {
  fetchPrices = require("./jobs/fetchData");
} catch (error) {
  console.error("❌ Error loading fetchData.js:", error);
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 📌 پشتیبانی از فرم-urlencoded
app.use(cors({ origin: "https://finoo.ir", methods: ["GET", "POST"] }));

// 📌 استفاده از `authRoutes`
app.use("/api/auth", authRoutes);

// 📌 استفاده از `dataRoutes`
app.use("/api", dataRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Finoo API is running...");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);

  // **📌 اجرای `fetchPrices()` بعد از بالا آمدن سرور**
  if (fetchPrices) {
    console.log("🔄 Fetching initial prices...");
    fetchPrices();
  } else {
    console.error("❌ fetchPrices is not available. Skipping...");
  }
});
