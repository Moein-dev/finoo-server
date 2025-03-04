const winston = require('winston');
const path = require('path');

// Define log levels and colors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
};

// Add colors to Winston
winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
    levels: levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                winston.format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        }),
        // Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error'
        }),
        // Write all logs with level 'info' and below to 'combined.log'
        new winston.transports.File({
            filename: path.join('logs', 'combined.log')
        })
    ]
});

// If we're not in production, log to the console with simple formatting
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Create log directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

module.exports = logger; 