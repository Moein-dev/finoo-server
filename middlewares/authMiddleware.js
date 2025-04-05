const jwt = require("jsonwebtoken");
const { sendErrorResponse } = require("../utils/responseHandler");

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return sendErrorResponse(res, 401, "کد دسترسی مورد نیاز است");

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return sendErrorResponse(res, 403, "کد دسترسی نامعتبر یا منقضی شده است");

        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
