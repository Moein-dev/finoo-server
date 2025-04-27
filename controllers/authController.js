const {
  createUser,
  getUserByUsername,
  clearUserRefreshToken,
  getUserById,
  updateUserRefreshToken,
} = require("../services/databaseService");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const jwt = require("jsonwebtoken");

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
