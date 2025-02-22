import { verify } from "jsonwebtoken";
import { sendErrorResponse } from "../utils/responseHandler";

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return sendErrorResponse(res, 401, "Access token is required");

    verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return sendErrorResponse(res, 403, "Invalid or expired access token");

        req.user = user;
        next();
    });
}

export default authenticateToken;
