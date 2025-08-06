require("dotenv").config();
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const authenticateToken = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");
const profileController = require("../controllers/profileController");


// 📌 تنظیمات `Multer` برای آپلود تصویر پروفایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const filename = `user_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  const allowedExtensions = [".jpeg", ".jpg", ".png"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    !allowedTypes.includes(file.mimetype) ||
    !allowedExtensions.includes(fileExtension)
  ) {
    return cb(
      new Error("نوع فایل نامعتبر است. فقط JPEG، PNG و JPG مجاز هستند."),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

// 🚀 محدود کردن درخواست‌های ثبت‌نام برای جلوگیری از Brute Force
const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 دقیقه
  max: 20, // حداکثر ۵ درخواست در این بازه
  message: {
    status: "error",
    message:
      "تلاش برای ثبت نام بسیار زیاد است، لطفاً بعداً دوباره امتحان کنید.",
  },
});

// 📌 **ثبت‌نام کاربر جدید (بدون تولید توکن)**
router.post("/register", registerLimiter, authController.register);

// 📌 **ورود کاربر (Login) و تولید `accessToken` + `refreshToken`**
router.post("/login", authController.login);

// 📌 **بروزرسانی اطلاعات پروفایل**
router.post(
  "/update-profile",
  authenticateToken,
  upload.single("image"),
  profileController.updateProfile
);

router.get("/verify-email", profileController.verifyEmail);

router.post("/profile/email", authenticateToken, profileController.saveAndSendEmailVerification);


router.post("/profile/phone", authenticateToken, profileController.sendPhoneVerificationCode);


router.post("/profile/verify-phone", authenticateToken, profileController.verifyPhone);


router.get("/profile", authenticateToken, profileController.getProfile);


// 📌 **تمدید توکن با استفاده از `refreshToken`**
router.post("/refresh", authController.refreshToken);


// 📌 **خروج از حساب و حذف `refreshToken`**
router.post("/logout", authController.logout);

router.post("/send-code", authController.requestLoginOtp);
router.post("/verfiy-code", authController.loginWithOtp);


module.exports = router;
