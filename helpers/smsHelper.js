// helpers/smsHelper.js

const axios = require("axios");

// 📌 تابع اصلی برای ارسال پیامک
async function sendSMS(phone, message) {
  try {
    // 🟡 اینجا به جای URL و پارامترهای فیک، اطلاعات پنل واقعی SMS رو وارد کن
    const response = await axios.post("https://your-sms-gateway.com/api/send", {
      to: phone,
      text: message,
      apiKey: process.env.SMS_API_KEY, // مثلاً کلید در .env ذخیره میشه
    });

    console.log("📤 پیامک با موفقیت ارسال شد:", response.data);
    return true;
  } catch (error) {
    console.error("❌ خطا در ارسال پیامک:", error.message);
    return false;
  }
}

module.exports = {
  sendSMS,
};
