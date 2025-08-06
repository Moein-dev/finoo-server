const {
  createUser,
  getUserByUsername,
  clearUserRefreshToken,
  getUserById,
  updateUserRefreshToken,
  getUserByPhone,
  createPhoneVerification,
} = require("../services/databaseService");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const jwt = require("jsonwebtoken");
const { sendSMS } = require("../helpers/smsHelper");

function generateRandomUsername() {
  return `user_${Math.floor(Math.random() * 1000000)}`;
}

exports.register = async (req, res) => {
  let { username } = req.body;

  if (!username) {
    let userExists;
    do {
      username = generateRandomUsername();
      userExists = await getUserByUsername(username);
    } while (userExists);
  }

  try {
    await createUser(username);
    return sendSuccessResponse(res, {
      username,
      message: "کاربر با موفقیت احراز هویت شد. لطفا وارد شوید تا کد دسترسی به سرور رو دریافت کنید",
    });
  } catch (err) {
    return sendErrorResponse(res, 500, err);
  }
};

exports.login = async (req, res) => {
  const { username } = req.body;

  if (!username || username.trim() === "") {
    return sendErrorResponse(res, 400, "نام کاربری مورد نیاز است");
  }

  try {
    const userData = await getUserByUsername(username);

    if (!userData) {
      return sendErrorResponse(res, 401, "نام کاربری صحیح نیست");
    }

    const userId = userData.id;

    const accessToken = jwt.sign(
      { id: userId, username: userData.username, role: userData.role },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    const refreshToken = jwt.sign(
      { id: userId, username: userData.username },
      process.env.REFRESH_SECRET_KEY,
      { expiresIn: "60d" }
    );

    await updateUserRefreshToken(userId, refreshToken);

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
      authentication: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err) {
    return sendErrorResponse(res, 500, err);
  }
};

exports.requestLoginOtp = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return sendErrorResponse(res, 400, "شماره تلفن الزامی است.");
  }

  try {
    const user = await getUserByPhone(phone);

    if (!user || !user.is_phone_verified) {
      return sendErrorResponse(res, 404, "کاربری با این شماره تایید شده یافت نشد.");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // ۵ دقیقه

    await createPhoneVerification(user.id, phone, code, expiresAt);

    const smsSent = await sendSMS(phone, `کد ورود: ${code}`);
    if (!smsSent) {
      return sendErrorResponse(res, 500, "ارسال پیامک با خطا مواجه شد.");
    }

    return sendSuccessResponse(res, { message: "کد تایید ارسال شد." });
  } catch (err) {
    console.error("❌ requestLoginOtp error:", err);
    return sendErrorResponse(res, 500, "خطا در ارسال کد ورود.");
  }
};

exports.loginWithOtp = async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return sendErrorResponse(res, 400, "شماره و کد الزامی هستند.");
  }

  try {
    const user = await getUserByPhone(phone);
    if (!user || !user.is_phone_verified) {
      return sendErrorResponse(res, 404, "کاربری با این شماره تایید شده یافت نشد.");
    }

    const verification = await getPhoneVerification(user.id, phone);
    if (!verification || verification.code !== code) {
      return sendErrorResponse(res, 400, "کد اشتباه است یا منقضی شده.");
    }

    if (new Date(verification.expires_at) < new Date()) {
      return sendErrorResponse(res, 400, "کد منقضی شده است.");
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.REFRESH_SECRET_KEY,
      { expiresIn: "60d" }
    );

    await updateUserRefreshToken(user.id, refreshToken);

    return sendSuccessResponse(res, {
      profile: user.toProfileJSON(),
      authentication: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err) {
    console.error("❌ loginWithOtp error:", err);
    return sendErrorResponse(res, 500, "خطا در ورود با OTP.");
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return sendErrorResponse(res, 400, "کد بازیابی نیاز است");

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);

    const user = await getUserById(decoded.id);
    if (!user) {
      return sendErrorResponse(res, 403, "کد بازیابی درست نیست");
    }

    const newAccessToken = jwt.sign(
      { id: decoded.id, username: user.username },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    return sendSuccessResponse(res, { accessToken: newAccessToken });
  } catch (err) {
    return sendErrorResponse(res, 403, "کد بازیابی نامعتبر یا منقضی شده است");
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return sendErrorResponse(res, 400, "کد بازیابی مورد نیاز است");

  try {
    await clearUserRefreshToken(refreshToken);
    return sendSuccessResponse(res, {
      message: "کاربر با موفقیت از حساب خارج شد",
    });
  } catch (err) {
    return sendErrorResponse(res, 500, err);
  }
};
