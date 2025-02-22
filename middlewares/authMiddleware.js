require("dotenv").config();
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token || token.length < 10) {
        return res.status(401).json({ status: "error", message: "Invalid or missing token." });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ status: "error", message: "Invalid token." });

        db.query("SELECT * FROM users WHERE token = ?", [token], (dbErr, result) => {
            if (dbErr) return res.status(500).json({ status: "error", message: "Database error" });

            if (result.length === 0) {
                return res.status(403).json({ status: "error", message: "Token not found in database." });
            }

            req.user = decoded;
            next();
        });
    });
};

module.exports = authenticateToken;
