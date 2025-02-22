require("dotenv").config();

const jwt = require("jsonwebtoken");
const express = require("express");
const db = require("../config/db");
const router = express.Router();

function generateRandomUsername() {
    return `user_${Math.floor(Math.random() * 1000000)}`;
}

router.post("/register", (req, res) => {
    let { username } = req.body;
    if (!username) {
        username = generateRandomUsername();
    }

    const token = jwt.sign({ username }, process.env.SECRET_KEY, { expiresIn: "1h" });

    db.query("INSERT INTO users (username, token) VALUES (?, ?)", [username, token], (err, result) => {
        if (err) return res.status(500).json({ status: "error", message: "Database error", error: err });

        res.json({ status: "success", username, token });
    });
});

module.exports = router;
