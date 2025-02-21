const express = require("express");
const cors = require("cors");
const db = require("./config/db"); // ✅ بررسی کن که این فایل در مسیر درست باشد
const dataRoutes = require("./routes/dataRoutes"); // ✅ بررسی کن که این فایل وجود دارد

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: "https://finoo.ir", methods: "GET" }));

// 📌 استفاده از `dataRoutes.js`
app.use("/api", dataRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Finoo API is running...");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

console.log("🚀 Webhook Test: Server Updated!");