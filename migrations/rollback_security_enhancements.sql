-- =====================================================
-- FINOO API SECURITY ENHANCEMENTS - ROLLBACK SCRIPT
-- =====================================================
-- Date: 2024-01-01
-- Version: 1.0
-- Description: Rollback script for security enhancements
-- 
-- ⚠️  WARNING: 
-- This script will permanently delete:
-- - All security event logs
-- - All blocked IP records
-- - All rate limiting tracking data
-- - OTP usage tracking data
-- 
-- Only use this script if absolutely necessary!
-- =====================================================

-- Confirmation check
SELECT 'WARNING: This will permanently delete security data!' as warning;
SELECT 'Type YES to continue, or cancel this script now.' as confirmation;

-- Uncomment the following line only if you're sure you want to proceed
-- SET @confirmed = 'YES';

-- Safety check
SELECT CASE 
    WHEN @confirmed = 'YES' THEN 'Proceeding with rollback...'
    ELSE 'Rollback cancelled - confirmation not provided'
END as status;

-- Only proceed if confirmed
SET @proceed = IF(@confirmed = 'YES', 1, 0);

-- Start transaction
START TRANSACTION;

-- =====================================================
-- DROP NEW TABLES
-- =====================================================

-- Drop rate_limit_tracking table
SET @sql = IF(@proceed = 1, 'DROP TABLE IF EXISTS rate_limit_tracking;', 'SELECT "Skipping rate_limit_tracking table drop" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop blocked_ips table
SET @sql = IF(@proceed = 1, 'DROP TABLE IF EXISTS blocked_ips;', 'SELECT "Skipping blocked_ips table drop" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop security_events table
SET @sql = IF(@proceed = 1, 'DROP TABLE IF EXISTS security_events;', 'SELECT "Skipping security_events table drop" as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- REMOVE INDEXES FROM PHONE_VERIFICATIONS
-- =====================================================

-- Drop attempts index
SET @sql = IF(@proceed = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND index_name = 'idx_phone_verifications_attempts'
) > 0, 'DROP INDEX idx_phone_verifications_attempts ON phone_verifications;', 'SELECT "Index idx_phone_verifications_attempts does not exist" as message;');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop is_used index
SET @sql = IF(@proceed = 1 AND (
    SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND index_name = 'idx_phone_verifications_is_used'
) > 0, 'DROP INDEX idx_phone_verifications_is_used ON phone_verifications;', 'SELECT "Index idx_phone_verifications_is_used does not exist" as message;');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- REMOVE COLUMNS FROM PHONE_VERIFICATIONS
-- =====================================================

-- Drop attempts column
SET @sql = IF(@proceed = 1 AND (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND column_name = 'attempts'
) > 0, 'ALTER TABLE phone_verifications DROP COLUMN attempts;', 'SELECT "Column attempts does not exist" as message;');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop is_used column
SET @sql = IF(@proceed = 1 AND (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'phone_verifications' 
    AND column_name = 'is_used'
) > 0, 'ALTER TABLE phone_verifications DROP COLUMN is_used;', 'SELECT "Column is_used does not exist" as message;');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify rollback
SELECT 'Rollback verification:' as info;

-- Check if tables were dropped
SELECT 
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'security_events') = 0 
         THEN 'security_events table dropped' 
         ELSE 'security_events table still exists' END as security_events_status,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'blocked_ips') = 0 
         THEN 'blocked_ips table dropped' 
         ELSE 'blocked_ips table still exists' END as blocked_ips_status,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rate_limit_tracking') = 0 
         THEN 'rate_limit_tracking table dropped' 
         ELSE 'rate_limit_tracking table still exists' END as rate_limit_tracking_status;

-- Check if columns were dropped
SELECT 
    CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'phone_verifications' AND column_name = 'is_used') = 0 
         THEN 'is_used column dropped' 
         ELSE 'is_used column still exists' END as is_used_status,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'phone_verifications' AND column_name = 'attempts') = 0 
         THEN 'attempts column dropped' 
         ELSE 'attempts column still exists' END as attempts_status;

-- Show current phone_verifications structure
SELECT 'Current phone_verifications structure:' as info;
DESCRIBE phone_verifications;

-- =====================================================
-- COMMIT OR ROLLBACK
-- =====================================================

SELECT CASE 
    WHEN @proceed = 1 THEN 'Rollback completed successfully!'
    ELSE 'Rollback was cancelled - no changes made'
END as final_status;

-- Commit the transaction
COMMIT;

-- =====================================================
-- POST-ROLLBACK NOTES
-- =====================================================

/*
POST-ROLLBACK CHECKLIST:

1. Update application code to remove references to:
   - security_events table
   - blocked_ips table
   - rate_limit_tracking table
   - is_used field in phone_verifications
   - attempts field in phone_verifications

2. Remove or comment out security-related code:
   - Security event logging
   - IP blocking functionality
   - Advanced rate limiting
   - OTP one-time use enforcement

3. Update environment variables:
   - Remove security logging configurations
   - Remove monitoring configurations

4. Test application functionality:
   - OTP generation and verification
   - Authentication flows
   - Basic rate limiting (if still implemented)

5. Monitor application logs for errors

IMPORTANT NOTES:
- All security event logs have been permanently deleted
- OTP usage tracking has been removed
- IP blocking functionality will no longer work
- Advanced rate limiting data has been lost
- You may need to redeploy application code that doesn't use these features

RECOVERY:
- To restore security features, run the deployment script again
- Previous security event logs cannot be recovered
- Consider implementing basic security measures until full deployment
*/