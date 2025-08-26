-- Test Script: Verify security migrations
-- Date: 2024-01-01
-- Description: Test script to verify all security-related database changes

-- Test 1: Verify phone_verifications table has new columns
SELECT 
    'phone_verifications table structure' as test_name,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'phone_verifications'
    AND COLUMN_NAME IN ('is_used', 'attempts')
ORDER BY ORDINAL_POSITION;

-- Test 2: Verify security_events table exists and has correct structure
SELECT 
    'security_events table structure' as test_name,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'security_events'
ORDER BY ORDINAL_POSITION;

-- Test 3: Verify indexes exist
SELECT 
    'Indexes verification' as test_name,
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN ('phone_verifications', 'security_events')
    AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME;

-- Test 4: Test inserting sample data into security_events
INSERT INTO security_events (event_type, user_id, ip_address, user_agent, details) 
VALUES ('test_event', NULL, '127.0.0.1', 'Test User Agent', '{"test": true}');

-- Test 5: Verify the insert worked
SELECT 
    'Sample data test' as test_name,
    id,
    event_type,
    ip_address,
    details,
    created_at
FROM security_events 
WHERE event_type = 'test_event'
LIMIT 1;

-- Clean up test data
DELETE FROM security_events WHERE event_type = 'test_event';

-- Test 6: Verify foreign key constraints
SELECT 
    'Foreign key constraints' as test_name,
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'security_events'
    AND REFERENCED_TABLE_NAME IS NOT NULL;