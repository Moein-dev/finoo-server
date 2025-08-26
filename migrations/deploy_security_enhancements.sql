-- Deployment Script: Apply all security enhancements
-- Date: 2024-01-01
-- Description: Complete deployment script for security improvements

-- Start transaction to ensure all changes are applied atomically
START TRANSACTION;

-- Step 1: Add security fields to phone_verifications table
-- Check if is_used column doesn't exist before adding
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'phone_verifications' 
    AND COLUMN_NAME = 'is_used'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE phone_verifications ADD COLUMN is_used BOOLEAN DEFAULT FALSE AFTER is_verified',
    'SELECT "Column is_used already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if attempts column doesn't exist before adding
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'phone_verifications' 
    AND COLUMN_NAME = 'attempts'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE phone_verifications ADD COLUMN attempts INT DEFAULT 0 AFTER is_used',
    'SELECT "Column attempts already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Create indexes for phone_verifications if they don't exist
CREATE INDEX IF NOT EXISTS idx_phone_verifications_is_used ON phone_verifications(is_used);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_attempts ON phone_verifications(user_id, phone, attempts);

-- Step 3: Create security_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL COMMENT 'Type of security event',
    user_id INT NULL COMMENT 'User ID if event is user-related',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of the request',
    user_agent TEXT NULL COMMENT 'User agent string from the request',
    details JSON NULL COMMENT 'Additional event details in JSON format',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the event occurred',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create indexes for security_events table
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON security_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Commit all changes
COMMIT;

-- Display success message
SELECT 'Security enhancements deployed successfully!' as status;