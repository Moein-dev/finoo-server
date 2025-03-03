-- Create database if not exists
CREATE DATABASE IF NOT EXISTS finoo_db;
USE finoo_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    refresh_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_name (name)
);

-- Create data sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    type ENUM('json', 'xml', 'html') DEFAULT 'json',
    active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,
    retry_count INT DEFAULT 3,
    retry_delay INT DEFAULT 5000,
    headers JSON,
    parser_config JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_source_active (active),
    INDEX idx_source_priority (priority)
);

-- Create source_categories junction table
CREATE TABLE IF NOT EXISTS source_categories (
    source_id INT,
    category_id INT,
    PRIMARY KEY (source_id, category_id),
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Create hourly_prices table
CREATE TABLE IF NOT EXISTS hourly_prices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(20, 4) NOT NULL,
    unit VARCHAR(10) DEFAULT 'IRR',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fetch_id INT NULL,
    source_id INT NULL,
    INDEX idx_symbol_timestamp (symbol, timestamp),
    INDEX idx_category (category),
    INDEX idx_timestamp (timestamp)
);

-- Create fetch_stats table
CREATE TABLE IF NOT EXISTS fetch_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trigger_type VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT 0,
    duration_ms INT,
    sources_total INT,
    sources_success INT,
    records_stored INT DEFAULT 0,
    error_message TEXT,
    source_id INT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trigger_type (trigger_type),
    INDEX idx_timestamp (timestamp)
);

-- Insert initial categories
INSERT INTO categories (name, description) VALUES
('gold', 'Gold and precious metals prices'),
('currency', 'Currency exchange rates'),
('cryptocurrency', 'Cryptocurrency prices'),
('silver', 'Silver prices');

-- Insert initial data sources
INSERT INTO data_sources (name, url, type, active, priority, retry_count, retry_delay, headers, parser_config) VALUES
(
    'BRS API',
    'https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency_v2.json',
    'json',
    true,
    1,
    3,
    5000,
    '{}',
    JSON_OBJECT(
        'gold', JSON_OBJECT(
            'path', 'gold',
            'mapping', JSON_OBJECT(
                'symbol', JSON_ARRAY('symbol', 'code', 'id'),
                'name', JSON_ARRAY('name', 'title'),
                'price', JSON_ARRAY('price', 'value'),
                'unit', 'IRR'
            )
        ),
        'currency', JSON_OBJECT(
            'path', 'currency',
            'mapping', JSON_OBJECT(
                'symbol', JSON_ARRAY('symbol', 'code', 'id'),
                'name', JSON_ARRAY('name', 'title'),
                'price', JSON_ARRAY('price', 'value'),
                'unit', 'IRR'
            )
        ),
        'cryptocurrency', JSON_OBJECT(
            'path', 'cryptocurrency',
            'mapping', JSON_OBJECT(
                'symbol', JSON_ARRAY('symbol', 'code', 'id'),
                'name', JSON_ARRAY('name', 'title'),
                'price', JSON_ARRAY('price', 'value'),
                'unit', 'USD'
            )
        )
    )
),
(
    'TGJU API',
    'https://call4.tgju.org/ajax.json',
    'json',
    true,
    2,
    3,
    5000,
    JSON_OBJECT(
        'accept', '*/*',
        'accept-language', 'en-US,en;q=0.9,fa;q=0.8'
    ),
    JSON_OBJECT(
        'silver', JSON_OBJECT(
            'path', 'current.silver_999.p',
            'mapping', JSON_OBJECT(
                'symbol', 'SILVER_999',
                'name', 'نقره 999',
                'price', 'value',
                'unit', 'IRR'
            ),
            'transform', JSON_OBJECT(
                'price', 'parseFloat(value.replace(/,/g, ""))'
            )
        )
    )
);

-- Link sources to categories
INSERT INTO source_categories (source_id, category_id)
SELECT s.id, c.id
FROM data_sources s
CROSS JOIN categories c
WHERE 
    (s.name = 'BRS API' AND c.name IN ('gold', 'currency', 'cryptocurrency'))
    OR (s.name = 'TGJU API' AND c.name = 'silver'); 