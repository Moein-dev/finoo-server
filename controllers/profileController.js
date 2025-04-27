const {
  getUserByEmailToken,
  verifyUserEmail,
  getUserById,
  updateUserEmailAndToken,
  countPhoneVerificationsLast5Minutes,
  createPhoneVerification,
  getPhoneVerification,
  verifyPhoneCode,
  markPhoneAsVerified,
  updateUserProfile,
} = require("../services/databaseService");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../helpers/emailHelper");
const { sendSMS } = require("../helpers/smsHelper");

exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return sendErrorResponse(res, 404, "کاربر پیدا نشد");
    }

    const updatedName = name || user.name;
    const updatedImage = image || user.image;

    await updateUserProfile(userId, updatedName, updatedImage);

    return sendSuccessResponse(res, {
      message: "حساب کاربری با موفقیت بروزرسانی شد",
      profile: {
        username: user.username,
        email: user.email,
        name: updatedName,
        image: updatedImage,
        phone: user.phone || null,
        is_email_verified: !!user.email_verified_at,
        is_phone_verified: !!user.phone,
      },
    });
  } catch (err) {
    return sendErrorResponse(res, 500, err);
  }
};;

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await getUserByEmailToken(token);
    if (!user) {
      return sendErrorResponse(res, 400, "توکن نامعتبر است یا قبلاً استفاده شده است.");
    }

    await verifyUserEmail(user.id);

    const updatedUser = await getUserById(user.id);

    return sendSuccessResponse(res, {
      message: "ایمیل شما با موفقیت تایید شد.",
      profile: {
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        phone: updatedUser.phone || null,
        is_email_verified: !!updatedUser.email_verified_at,
        is_phone_verified: !!updatedUser.phone,
      },
    });
  } catch (error) {
    console.error("❌ Email verification error:", error);
    return sendErrorResponse(res, 500, "خطا در تایید ایمیل.");
  }
};

exports.saveAndSendEmailVerification = async (req, res) => {
  const userId = req.user.id;
  const { email } = req.body;

  if (!email) {
    return sendErrorResponse(res, 400, "ایمیل الزامی است");
  }

  const token = crypto.randomBytes(32).toString("hex");

  try {
    await updateUserEmailAndToken(userId, email, token);
    await sendVerificationEmail(email, token);

    return sendSuccessResponse(res, {
      message: "ایمیل ذخیره شد و لینک تأیید ارسال شد",
    });
  } catch (error) {
    console.error("❌ Email update error:", error);
    return sendErrorResponse(res, 500, "خطا در ذخیره ایمیل");
  }
};

exports.sendPhoneVerificationCode = async (req, res) => {
  const userId = req.user.id;
  const { phone } = req.body;

  if (!phone) return sendErrorResponse(res, 400, "شماره تلفن الزامی است");

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 رقمی
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // اعتبار ۵ دقیقه‌ای

  try {
    const recentCount = await countPhoneVerificationsLast5Minutes(userId);
    if (recentCount >= 3) {
      return sendErrorResponse(res, 429, "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه بعد دوباره تلاش کنید.");
    }

    await createPhoneVerification(userId, phone, code, expiresAt);

    const smsSent = await sendSMS(phone, `کد تایید شما: ${code}`);
    if (!smsSent) {
      return sendErrorResponse(res, 500, "ارسال پیامک با خطا مواجه شد");
    }

    return sendSuccessResponse(res, {
      message: "کد تایید به شماره ارسال شد",
    });
  } catch (error) {
    return sendErrorResponse(res, 500, "خطا در ذخیره شماره تلفن");
  }
};

exports.verifyPhone = async (req, res) => {
  const userId = req.user.id;
  const { phone, code } = req.body;

  if (!phone || !code)
    return sendErrorResponse(res, 400, "شماره و کد تایید الزامی هستند");

  try {
    const verification = await getPhoneVerification(userId, phone);

    if (!verification)
      return sendErrorResponse(res, 400, "درخواستی برای این شماره یافت نشد");

    if (verification.is_verified)
      return sendErrorResponse(res, 400, "شماره قبلاً تایید شده است");

    if (new Date(verification.expires_at) < new Date())
      return sendErrorResponse(res, 400, "کد منقضی شده است");

    if (verification.code !== code)
      return sendErrorResponse(res, 400, "کد وارد شده نادرست است");

    await verifyPhoneCode(userId, phone, code);
    await markPhoneAsVerified(userId, phone);

    const user = await getUserById(userId);

    return sendSuccessResponse(res, {
      message: "شماره تلفن با موفقیت تایید شد",
      profile: {
        username: user.username,
        phone: user.phone,
        is_phone_verified: !!user.phone,
        email: user.email || null,
        is_email_verified: !!user.email_verified_at,
        name: user.name || null,
        image: user.image || null,
      },
    });
  } catch (error) {
    return sendErrorResponse(res, 500, "خطا در تایید شماره تلفن");
  }
};

exports.getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await getUserById(userId);

    if (!user) {
      return sendErrorResponse(res, 404, "کاربر پیدا نشد");
    }

    return sendSuccessResponse(res, {
      profile: {
        username: user.username,
        email: user.email,
        name: user.name,
        image: user.image,
        phone: user.phone || null,
        is_email_verified: !!user.email_verified_at,
        is_phone_verified: !!user.phone,
      },
    });
  } catch (error) {
    return sendErrorResponse(res, 500, "خطا در دریافت اطلاعات کاربر");
  }
};
