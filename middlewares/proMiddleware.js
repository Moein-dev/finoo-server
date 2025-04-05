const { sendErrorResponse } = require("../utils/responseHandler");

function requireProUser(req, res, next) {
    if (req.user.role !== "pro") {
        return sendErrorResponse(res, 403, "دسترسی رد شد. عضویت حرفه ای الزامی است");
    }
    next();
}

module.exports = requireProUser;
