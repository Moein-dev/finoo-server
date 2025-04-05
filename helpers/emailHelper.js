// helpers/emailHelper.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // یا mailgun, or custom SMTP
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendVerificationEmail(to, token) {
  const verifyLink = `https://finoo.ir/api/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: "تایید ایمیل",
    html: `<p>برای تایید ایمیل خود <a href="${verifyLink}">اینجا کلیک کنید</a></p>`,
  });
}

module.exports = { sendVerificationEmail };
