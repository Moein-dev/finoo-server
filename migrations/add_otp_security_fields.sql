-- Migration: Add security fields to phone_verifications table and create security_events table
-- Date: 2024-01-01
-- Description: Add is_used and attempts fields for enhanced OTP security and create security logging table

-- Add is_used field to track if OTP has been used
ALTER TABLE phone_verifications 
ADD COLUMN is_used BOOLEAN DEFAULT FALSE AFTER is_verified;

-- Add attempts field to track failed verification attempts
ALTER TABLE phone_verifications 
ADD COLUMN attempts INT DEFAULT 0 AFTER is_used;

-- Add index for better performance on is_used queries
CREATE INDEX idx_phone_verifications_is_used ON phone_verifications(is_used);

-- Add index for attempts tracking
CREATE INDEX idx_phone_verifications_attempts ON phone_verifications(user_id, phone, attempts);

-- Create security_events table for logging security-related events
CREATE TABLE security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for security_events table
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_created ON security_events(created_at);
CREATE INDEX idx_security_events_type_created ON security_events(event_type, created_at);