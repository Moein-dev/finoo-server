const {
  createUser,
  createUserWithPhone,
  getUserByUsername,
  clearUserRefreshToken,
  getUserById,
  updateUserRefreshToken,
  getUserByPhone,
  createPhoneVerification,
  getValidPhoneVerification,
  markOTPAsUsed,
  incrementFailedAttempts,
} = require("../services/databaseService");
const {
  sendSuccessResponse,
} = require("../utils/responseHandler");
const securityErrorHandler = require("../utils/securityErrorHandler");
const { sendSMS } = require("../helpers/smsHelper");
const {
  generateTokenPair,
  refreshAccessToken,
  validateSecretKeyStrength,
} = require("../utils/jwtSecurity");
const { 
  generateSecureOTP, 
  generateRandomUsername 
} = require("../utils/codeGenerators");
const { 
  OTP_CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} = require("../config/constants");

// Validate secret keys on startup
try {
  validateSecretKeyStrength(process.env.SECRET_KEY);
  validateSecretKeyStrength(process.env.REFRESH_SECRET_KEY);
} catch (error) {
  console.error("❌ JWT Secret Key Validation Error:", error.message);
  process.exit(1);
}



exports.register = async (req, res) => {
  let { username, name } = req.body;

  if (!username) {
    let userExists;
    do {
      username = generateRandomUsername();
      userExists = await getUserByUsername(username);
    } while (userExists);
  }

  try {
    await createUser(username, name);
    return sendSuccessResponse(res, {
      username,
      message: SUCCESS_MESSAGES.USER_REGISTERED,
    });
  } catch (err) {
    const errorResponse = securityErrorHandler.handleDatabaseError(err, req);
    return res.status(errorResponse.status).json(errorResponse);
  }
};

exports.login = async (req, res) => {
  // Input validation is now handled by middleware
  // req.body contains sanitized data
  const { username } = req.body;

  try {
    const userData = await getUserByUsername(username);

    if (!userData) {
      const authError = new Error(ERROR_MESSAGES.AUTHENTICATION.INVALID_CREDENTIALS);
      const errorResponse = securityErrorHandler.handleAuthenticationError(
        authError,
        req
      );
      return res.status(errorResponse.status).json(errorResponse);
    }

    const userId = userData.id;

    const tokens = generateTokenPair({
      id: userId,
      username: userData.username,
      role: userData.role,
    });

    await updateUserRefreshToken(userId, tokens.refresh_token);

    return sendSuccessResponse(res, {
      profile: {
        username: userData.username,
        email: userData.email || null,
        is_email_verified: !!userData.email_verified_at,
        phone: userData.phone || null,
        is_phone_verified: !!userData.phone,
        name: userData.name || null,
        image: userData.image || null,
      },
      authentication: tokens,
    });
  } catch (err) {
    const errorResponse = securityErrorHandler.handleDatabaseError(err, req);
    return res.status(errorResponse.status).json(errorResponse);
  }
};

exports.requestLoginOtp = async (req, res) => {
  // Input validation is now handled by middleware
  // req.body contains sanitized data
  const { phone } = req.body;

  try {
    let user = await getUserByPhone(phone);

    // اگر کاربر وجود نداشت، کاربر جدید ایجاد کن
    if (!user) {
      user = await createUserWithPhone(phone);
      if (!user) {
        const dbError = new Error("خطا در ایجاد کاربر جدید");
        const errorResponse = securityErrorHandler.handleDatabaseError(
          dbError,
          req
        );
        return res.status(errorResponse.status).json(errorResponse);
      }
    }

    // Generate secure 6-digit OTP
    const code = generateSecureOTP();
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

    await createPhoneVerification(user.id, phone, code, expiresAt);

    const smsSent = await sendSMS(phone, `اپلیکیشن فینو\nکد ورود: ${code}`);
    if (!smsSent) {
      const smsError = new Error(ERROR_MESSAGES.OTP.SEND_FAILED);
      const errorResponse = securityErrorHandler.handleGenericError(
        smsError,
        req
      );
      return res.status(errorResponse.status).json(errorResponse);
    }

    return sendSuccessResponse(res, { message: ERROR_MESSAGES.OTP.CODE_SENT });
  } catch (err) {
    const errorResponse = securityErrorHandler.handleGenericError(err, req);
    return res.status(errorResponse.status).json(errorResponse);
  }
};

exports.loginWithOtp = async (req, res) => {
  // Input validation is now handled by middleware
  // req.body contains sanitized data
  const { phone, code } = req.body;

  try {
    let user = await getUserByPhone(phone);

    // اگر کاربر وجود نداشت، کاربر جدید ایجاد کن
    if (!user) {
      user = await createUserWithPhone(phone);
      if (!user) {
        const dbError = new Error("خطا در ایجاد کاربر جدید");
        const errorResponse = securityErrorHandler.handleDatabaseError(
          dbError,
          req
        );
        return res.status(errorResponse.status).json(errorResponse);
      }
    }

    // استفاده از getValidPhoneVerification برای بررسی one-time use
    const verification = await getValidPhoneVerification(user.id, phone, code);

    if (!verification) {
      // افزایش تعداد تلاش‌های ناموفق
      await incrementFailedAttempts(user.id, phone);
      const otpError = new Error(ERROR_MESSAGES.OTP.INVALID_OR_EXPIRED);
      const errorResponse = securityErrorHandler.handleOTPError(otpError, req);
      return res.status(errorResponse.status).json(errorResponse);
    }

    // علامت‌گذاری OTP به عنوان استفاده شده
    await markOTPAsUsed(verification.id);

    const tokens = generateTokenPair({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    await updateUserRefreshToken(user.id, tokens.refresh_token);

    return sendSuccessResponse(res, {
      profile: user.toProfileJSON(),
      authentication: tokens,
    });
  } catch (err) {
    const errorResponse = securityErrorHandler.handleGenericError(err, req);
    return res.status(errorResponse.status).json(errorResponse);
  }
};

exports.refreshToken = async (req, res) => {
  // Input validation is now handled by middleware
  // req.body contains sanitized data
  const { refreshToken } = req.body;

  try {
    const result = await refreshAccessToken(refreshToken, getUserById);
    return sendSuccessResponse(res, result);
  } catch (err) {
    const jwtError = new Error(ERROR_MESSAGES.AUTHENTICATION.REFRESH_TOKEN_INVALID);
    jwtError.tokenType = "refresh";
    const errorResponse = securityErrorHandler.handleJWTError(jwtError, req);
    return res.status(errorResponse.status).json(errorResponse);
  }
};

exports.logout = async (req, res) => {
  // Input validation is now handled by middleware
  // req.body contains sanitized data
  const { refreshToken } = req.body;

  try {
    await clearUserRefreshToken(refreshToken);
    return sendSuccessResponse(res, {
      message: SUCCESS_MESSAGES.USER_LOGGED_OUT,
    });
  } catch (err) {
    const errorResponse = securityErrorHandler.handleDatabaseError(err, req);
    return res.status(errorResponse.status).json(errorResponse);
  }
};
