const jwt = require("jsonwebtoken");
const securityErrorHandler = require("../utils/securityErrorHandler");

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        const authError = new Error("کد دسترسی مورد نیاز است");
        const errorResponse = securityErrorHandler.handleAuthenticationError(authError, req);
        return res.status(errorResponse.status).json(errorResponse);
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) {
            const jwtError = new Error("کد دسترسی نامعتبر یا منقضی شده است");
            jwtError.tokenType = "access";
            const errorResponse = securityErrorHandler.handleJWTError(jwtError, req);
            return res.status(errorResponse.status).json(errorResponse);
        }

        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
