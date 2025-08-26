-- Migration: Create security_events table for security logging
-- Date: 2024-01-01
-- Description: Create dedicated table for logging security-related events

-- Create security_events table for logging security-related events
CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL COMMENT 'Type of security event (failed_login, rate_limit_exceeded, etc.)',
    user_id INT NULL COMMENT 'User ID if event is user-related',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of the request (supports IPv6)',
    user_agent TEXT NULL COMMENT 'User agent string from the request',
    details JSON NULL COMMENT 'Additional event details in JSON format',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the event occurred',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Security events logging table';

-- Add indexes for security_events table for better query performance
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_created ON security_events(created_at);
CREATE INDEX idx_security_events_type_created ON security_events(event_type, created_at);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);