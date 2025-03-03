const jwt = require('jsonwebtoken');

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = {
    verifyToken
};