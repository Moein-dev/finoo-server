const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'finoo_admin',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'finoo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connection established');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error connecting to database:', err.message);
    });

module.exports = pool;
