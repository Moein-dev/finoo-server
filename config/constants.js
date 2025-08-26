/**
 * Application Constants
 * Centralized constants for the entire application
 */

// OTP Configuration
const OTP_CONFIG = {
  EXPIRY_MINUTES: 2, // OTP expiry time in minutes
  LENGTH: 6, // OTP length
  MAX_ATTEMPTS: 3, // Maximum failed attempts
  RATE_LIMIT_WINDOW: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Phone Verification Configuration
const PHONE_VERIFICATION_CONFIG = {
  EXPIRY_MINUTES: 5, // Phone verification expiry time
  MAX_REQUESTS_PER_5MIN: 3, // Maximum requests per 5 minutes
};

// File Upload Configuration
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB in bytes
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/jpg"],
  ALLOWED_EXTENSIONS: [".jpeg", ".jpg", ".png"],
  UPLOAD_PATH: "uploads/",
};

// Rate Limiting Configuration
const RATE_LIMIT_CONFIG = {
  OTP: {
    WINDOW_MS: 5 * 60 * 1000, // 5 minutes
    MAX_REQUESTS: 3,
    MESSAGE: 'تعداد درخواست‌های OTP بیش از حد مجاز است',
    WAIT_MESSAGE: 'لطفاً 5 دقیقه صبر کنید و دوباره تلاش کنید'
  },
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5,
    MESSAGE: 'تعداد تلاش‌های ورود بیش از حد مجاز است',
    WAIT_MESSAGE: 'لطفاً 15 دقیقه صبر کنید و دوباره تلاش کنید'
  },
  REGISTER: {
    WINDOW_MS: 1 * 60 * 1000, // 1 minute
    MAX_REQUESTS: 20,
    MESSAGE: 'تلاش برای ثبت نام بسیار زیاد است',
    WAIT_MESSAGE: 'لطفاً بعداً دوباره امتحان کنید'
  }
};

// Error Messages
const ERROR_MESSAGES = {
  AUTHENTICATION: {
    INVALID_CREDENTIALS: "نام کاربری صحیح نیست",
    TOKEN_REQUIRED: "کد دسترسی مورد نیاز است",
    TOKEN_INVALID: "کد دسترسی نامعتبر یا منقضی شده است",
    REFRESH_TOKEN_INVALID: "کد بازیابی نامعتبر یا منقضی شده است"
  },
  OTP: {
    INVALID_OR_EXPIRED: "کد اشتباه است، منقضی شده یا قبلاً استفاده شده",
    SEND_FAILED: "ارسال پیامک با خطا مواجه شد",
    CODE_SENT: "کد تایید ارسال شد."
  },
  VALIDATION: {
    PHONE_REQUIRED: "شماره تلفن الزامی است",
    EMAIL_REQUIRED: "ایمیل الزامی است",
    CODE_REQUIRED: "کد تایید الزامی است",
    USERNAME_REQUIRED: "نام کاربری الزامی است"
  }
};

// Success Messages
const SUCCESS_MESSAGES = {
  USER_REGISTERED: "کاربر با موفقیت احراز هویت شد. لطفا وارد شوید تا کد دسترسی به سرور رو دریافت کنید",
  USER_LOGGED_OUT: "کاربر با موفقیت از حساب خارج شد",
  PROFILE_UPDATED: "حساب کاربری با موفقیت بروزرسانی شد",
  EMAIL_VERIFIED: "ایمیل شما با موفقیت تایید شد.",
  PHONE_VERIFIED: "شماره تلفن با موفقیت تایید شد",
  EMAIL_VERIFICATION_SENT: "ایمیل ذخیره شد و لینک تأیید ارسال شد",
  PHONE_CODE_SENT: "کد تایید ارسال شد."
};

module.exports = {
  OTP_CONFIG,
  PHONE_VERIFICATION_CONFIG,
  UPLOAD_CONFIG,
  RATE_LIMIT_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};