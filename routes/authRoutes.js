require("dotenv").config();
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");
const profileController = require("../controllers/profileController");
const { 
  otpRateLimit, 
  loginRateLimit,
  registerRateLimit
} = require("../middlewares/rateLimiter");
const InputValidator = require("../utils/inputValidator");
const { sensitiveEndpointHeaders } = require("../middlewares/securityHeaders");
const { upload } = require("../middlewares/uploadMiddleware");

// 📌 Input validation schemas
const loginValidationSchema = {
  username: { type: 'username' }
};

const otpRequestValidationSchema = {
  phone: { type: 'phone' }
};

const otpLoginValidationSchema = {
  phone: { type: 'phone' },
  code: { type: 'otp' }
};

const refreshTokenValidationSchema = {
  refreshToken: { type: 'refreshToken' }
};

const registerValidationSchema = {
  username: { 
    type: 'username',
    required: false // username is optional in register
  },
  name: {
    required: false // name is optional
  }
};



// 📌 **ثبت‌نام کاربر جدید (بدون تولید توکن)**
router.post("/register", 
  registerRateLimit, 
  InputValidator.createValidationMiddleware(registerValidationSchema),
  authController.register
);

// 📌 **ورود کاربر (Login) و تولید `accessToken` + `refreshToken`**
router.post("/login", 
  sensitiveEndpointHeaders,
  loginRateLimit, 
  InputValidator.createValidationMiddleware(loginValidationSchema),
  authController.login
);

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
router.post("/refresh", 
  sensitiveEndpointHeaders,
  InputValidator.createValidationMiddleware(refreshTokenValidationSchema),
  authController.refreshToken
);

// 📌 **خروج از حساب و حذف `refreshToken`**
router.post("/logout", 
  sensitiveEndpointHeaders,
  InputValidator.createValidationMiddleware(refreshTokenValidationSchema),
  authController.logout
);

router.post("/send-code", 
  sensitiveEndpointHeaders,
  otpRateLimit, 
  InputValidator.createValidationMiddleware(otpRequestValidationSchema),
  authController.requestLoginOtp
);
router.post("/verify-code", 
  sensitiveEndpointHeaders,
  loginRateLimit, 
  InputValidator.createValidationMiddleware(otpLoginValidationSchema),
  authController.loginWithOtp
);


module.exports = router;
