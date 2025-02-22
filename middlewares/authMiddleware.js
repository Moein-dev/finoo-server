require("dotenv").config();
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ status: "error", message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ status: "error", message: "Invalid token" });

        req.user = user; // ذخیره اطلاعات کاربر در `req.user`
        next();
    });
}

module.exports = authenticateToken;
