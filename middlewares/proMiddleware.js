const { sendErrorResponse } = require("../utils/responseHandler");

function requireProUser(req, res, next) {
    if (req.user.role !== "pro") {
        return sendErrorResponse(res, 403, "Access denied. Pro membership required.");
    }
    next();
}

module.exports = requireProUser;
