const axios = require("axios");

/**
 * ارسال پیامک با سرویس Trez.ir
 * @param {string} phone شماره موبایل کاربر
 * @param {string} message متن پیامک
 * @returns {Promise<boolean>} موفقیت یا شکست
 */
async function sendSMS(phone, message) {
  try {
    const params = new URLSearchParams();
    params.append("Username", process.env.SMS_USERNAME);
    params.append("Password", process.env.SMS_PASSWORD);
    params.append("Mobile", phone);
    params.append("Message", message);

    const response = await axios.post(
      "http://smspanel.Trez.ir/SendMessageWithCode.ashx",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("📤 SMS sent successfully:", response.data);
    return true;
  } catch (error) {
    console.error("❌ SMS sending failed:", error.message);
    return false;
  }
}

module.exports = {
  sendSMS,
};