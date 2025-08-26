-- =====================================================
-- FINOO API SECURITY ENHANCEMENTS - PRODUCTION DEPLOYMENT
-- =====================================================
-- Date: 2024-01-01
-- Version: 1.0
-- Description: Complete security enhancements for production deployment
-- 
-- IMPORTANT: 
-- 1. Create a full database backup before running this script
-- 2. Test in development environment first
-- 3. Run during maintenance window if possible
-- =====================================================

-- Start transaction for atomic deployment
START TRANSACTION;

-- =====================================================
-- SAFETY CHECKS
-- =====================================================

-- Check if we're connected to the right database
SELECT 'Starting security migration deployment...' as status;

-- Verify required tables exist
SELECT COUNT(*) as users_table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'users';

SELECT COUNT(*) as phone_verifications_table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'phone_verifications';

-- =====================================================
-- PHONE_VERIFICATIONS TABLE ENHANCEMENTS
-- =====================================================

-- Add is_used column if it doesn't exist
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE phone_verifications ADD COLUMN is_used BOOLEAN DEFAULT FALSE AFTER is_verified;',
        'SELECT "Column is_used already exists" as message;'
    )
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND column_name = 'is_used'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add attempts column if it doesn't exist
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE phone_verifications ADD COLUMN attempts INT DEFAULT 0 AFTER is_used;',
        'SELECT "Column attempts already exists" as message;'
    )
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND column_name = 'attempts'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- INDEXES FOR PHONE_VERIFICATIONS
-- =====================================================

-- Create index for is_used if it doesn't exist
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'CREATE INDEX idx_phone_verifications_is_used ON phone_verifications(is_used);',
        'SELECT "Index idx_phone_verifications_is_used already exists" as message;'
    )
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND index_name = 'idx_phone_verifications_is_used'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create index for attempts tracking if it doesn't exist
SET @sql = (
    SELECT IF(
        COUNT(*) = 0,
        'CREATE INDEX idx_phone_verifications_attempts ON phone_verifications(user_id, phone, attempts);',
        'SELECT "Index idx_phone_verifications_attempts already exists" as message;'
    )
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND index_name = 'idx_phone_verifications_attempts'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- SECURITY_EVENTS TABLE CREATION
-- =====================================================

-- Create security_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL COMMENT 'Type of security event (failed_login, rate_limit_exceeded, etc.)',
    user_id INT NULL COMMENT 'Related user ID (can be null for anonymous events)',
    ip_address VARCHAR(45) NULL COMMENT 'Client IP address (IPv6 compatible)',
    user_agent TEXT NULL COMMENT 'Client user agent string',
    details JSON NULL COMMENT 'Additional event details in JSON format',
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW' COMMENT 'Event severity level',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Event timestamp',
    INDEX idx_security_events_type (event_type),
    INDEX idx_security_events_user (user_id),
    INDEX idx_security_events_created (created_at),
    INDEX idx_security_events_type_created (event_type, created_at),
    INDEX idx_security_events_ip (ip_address),
    INDEX idx_security_events_severity (severity),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Security events logging table for monitoring and analysis';

-- =====================================================
-- BLOCKED_IPS TABLE CREATION (for IP blocking feature)
-- =====================================================

-- Create blocked_ips table if it doesn't exist
CREATE TABLE IF NOT EXISTS blocked_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL COMMENT 'Blocked IP address',
    reason VARCHAR(255) NOT NULL COMMENT 'Reason for blocking',
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When IP was blocked',
    expires_at TIMESTAMP NULL COMMENT 'When block expires (NULL for permanent)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether block is currently active',
    created_by VARCHAR(100) DEFAULT 'SYSTEM' COMMENT 'Who/what created the block',
    UNIQUE KEY unique_active_ip (ip_address, is_active),
    INDEX idx_blocked_ips_ip (ip_address),
    INDEX idx_blocked_ips_expires (expires_at),
    INDEX idx_blocked_ips_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Blocked IP addresses for security protection';

-- =====================================================
-- RATE_LIMIT_TRACKING TABLE CREATION
-- =====================================================

-- Create rate_limit_tracking table for advanced rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL COMMENT 'Rate limit identifier (IP, user_id, etc.)',
    endpoint VARCHAR(255) NOT NULL COMMENT 'API endpoint being rate limited',
    request_count INT DEFAULT 1 COMMENT 'Number of requests in current window',
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Start of current rate limit window',
    last_request TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last request timestamp',
    UNIQUE KEY unique_identifier_endpoint (identifier, endpoint),
    INDEX idx_rate_limit_identifier (identifier),
    INDEX idx_rate_limit_endpoint (endpoint),
    INDEX idx_rate_limit_window (window_start),
    INDEX idx_rate_limit_last_request (last_request)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Rate limiting tracking for advanced rate limiting features';

-- =====================================================
-- UPDATE EXISTING DATA
-- =====================================================

-- Set default values for existing records
UPDATE phone_verifications 
SET is_used = FALSE, attempts = 0 
WHERE is_used IS NULL OR attempts IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify phone_verifications table structure
SELECT 'phone_verifications table structure:' as info;
DESCRIBE phone_verifications;

-- Verify security_events table structure
SELECT 'security_events table structure:' as info;
DESCRIBE security_events;

-- Verify blocked_ips table structure
SELECT 'blocked_ips table structure:' as info;
DESCRIBE blocked_ips;

-- Verify rate_limit_tracking table structure
SELECT 'rate_limit_tracking table structure:' as info;
DESCRIBE rate_limit_tracking;

-- Check indexes
SELECT 'Indexes on phone_verifications:' as info;
SHOW INDEX FROM phone_verifications;

SELECT 'Indexes on security_events:' as info;
SHOW INDEX FROM security_events;

-- =====================================================
-- INSERT INITIAL DATA
-- =====================================================

-- Insert initial security event for deployment tracking
INSERT INTO security_events (event_type, details, severity) 
VALUES ('system_deployment', JSON_OBJECT('migration', 'security_enhancements_v1.0', 'timestamp', NOW()), 'MEDIUM');

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Count records to verify everything is working
SELECT 
    (SELECT COUNT(*) FROM phone_verifications) as phone_verifications_count,
    (SELECT COUNT(*) FROM security_events) as security_events_count,
    (SELECT COUNT(*) FROM blocked_ips) as blocked_ips_count,
    (SELECT COUNT(*) FROM rate_limit_tracking) as rate_limit_tracking_count;

-- Verify foreign key constraints
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('security_events', 'blocked_ips', 'rate_limit_tracking');

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

SELECT 'Security migration completed successfully!' as status;
COMMIT;

-- =====================================================
-- POST-DEPLOYMENT NOTES
-- =====================================================

/*
POST-DEPLOYMENT CHECKLIST:

1. Verify application can connect to database
2. Test OTP functionality with new is_used field
3. Test security event logging
4. Monitor application logs for any database errors
5. Update application environment variables if needed
6. Test rate limiting functionality
7. Verify security monitoring is working

ENVIRONMENT VARIABLES TO CHECK:
- All existing database connection variables should work
- No new database-related environment variables required
- Security logging will use the new security_events table

PERFORMANCE NOTES:
- New indexes will improve query performance
- security_events table may grow large - consider log rotation
- Monitor database performance after deployment

ROLLBACK INFORMATION:
- A rollback script is available if needed
- Rollback will remove new tables and columns
- Security event logs will be lost in rollback
*/