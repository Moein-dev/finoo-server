const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const dataRoutes = require("./routes/dataRoutes"); 
const authRoutes = require("./routes/authRoutes"); // 👈 بررسی کن که این فایل وجود داشته باشد!
const fetchPrices = require("./fetchData");

fetchPrices(); // اجرای اولیه
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: "https://finoo.ir", methods: ["GET","POST"], }));

// 📌 استفاده از `authRoutes`
app.use("/api/auth", authRoutes); // 👈 مسیر صحیح برای authRoutes

// 📌 استفاده از `dataRoutes`
app.use("/api", dataRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Finoo API is running...");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
