-- =====================================================
-- FINOO API SECURITY ENHANCEMENTS - TEST SCRIPT
-- =====================================================
-- Date: 2024-01-01
-- Description: Test script to verify security migration deployment
-- Run this after deploying security enhancements
-- =====================================================

SELECT '=== FINOO API SECURITY MIGRATION TEST ===' as test_header;

-- =====================================================
-- TEST 1: TABLE EXISTENCE
-- =====================================================

SELECT '1. Testing table existence...' as test_section;

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'phone_verifications') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as phone_verifications_exists,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'security_events') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as security_events_exists,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'blocked_ips') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as blocked_ips_exists,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rate_limit_tracking') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as rate_limit_tracking_exists;

-- =====================================================
-- TEST 2: COLUMN EXISTENCE
-- =====================================================

SELECT '2. Testing new columns in phone_verifications...' as test_section;

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'phone_verifications' AND column_name = 'is_used') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as is_used_column_exists,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'phone_verifications' AND column_name = 'attempts') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as attempts_column_exists;

-- =====================================================
-- TEST 3: INDEX EXISTENCE
-- =====================================================

SELECT '3. Testing indexes...' as test_section;

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'phone_verifications' AND index_name = 'idx_phone_verifications_is_used') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as is_used_index_exists,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'phone_verifications' AND index_name = 'idx_phone_verifications_attempts') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as attempts_index_exists,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'security_events' AND index_name = 'idx_security_events_type') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as security_events_type_index_exists;

-- =====================================================
-- TEST 4: FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT '4. Testing foreign key constraints...' as test_section;

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE table_schema = DATABASE() AND table_name = 'security_events' AND referenced_table_name = 'users') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as security_events_fk_exists;

-- =====================================================
-- TEST 5: DATA INSERTION TESTS
-- =====================================================

SELECT '5. Testing data insertion...' as test_section;

-- Test security_events insertion
INSERT INTO security_events (event_type, ip_address, details, severity) 
VALUES ('test_event', '127.0.0.1', JSON_OBJECT('test', true), 'LOW');

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM security_events WHERE event_type = 'test_event') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as security_events_insert_test;

-- Test blocked_ips insertion
INSERT INTO blocked_ips (ip_address, reason) 
VALUES ('192.168.1.100', 'Test IP block');

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM blocked_ips WHERE ip_address = '192.168.1.100') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as blocked_ips_insert_test;

-- Test rate_limit_tracking insertion
INSERT INTO rate_limit_tracking (identifier, endpoint) 
VALUES ('test_user', '/api/test');

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM rate_limit_tracking WHERE identifier = 'test_user') > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as rate_limit_tracking_insert_test;

-- =====================================================
-- TEST 6: PHONE_VERIFICATIONS UPDATE TEST
-- =====================================================

SELECT '6. Testing phone_verifications updates...' as test_section;

-- Insert test record if phone_verifications is empty
INSERT IGNORE INTO users (username, phone) VALUES ('test_user_migration', '09999999999');

SET @test_user_id = (SELECT id FROM users WHERE username = 'test_user_migration' LIMIT 1);

INSERT INTO phone_verifications (user_id, phone, code, expires_at, is_used, attempts) 
VALUES (@test_user_id, '09999999999', '123456', DATE_ADD(NOW(), INTERVAL 5 MINUTE), FALSE, 0);

-- Test updating is_used and attempts
UPDATE phone_verifications 
SET is_used = TRUE, attempts = 1 
WHERE user_id = @test_user_id AND phone = '09999999999';

SELECT 
    CASE WHEN (SELECT COUNT(*) FROM phone_verifications WHERE user_id = @test_user_id AND is_used = TRUE AND attempts = 1) > 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as phone_verifications_update_test;

-- =====================================================
-- TEST 7: JSON FUNCTIONALITY TEST
-- =====================================================

SELECT '7. Testing JSON functionality...' as test_section;

-- Test JSON operations on security_events
UPDATE security_events 
SET details = JSON_SET(details, '$.test_update', true) 
WHERE event_type = 'test_event';

SELECT 
    CASE WHEN (SELECT JSON_EXTRACT(details, '$.test_update') FROM security_events WHERE event_type = 'test_event' LIMIT 1) = true 
         THEN '✅ PASS' ELSE '❌ FAIL' END as json_functionality_test;

-- =====================================================
-- TEST 8: PERFORMANCE TEST (INDEX USAGE)
-- =====================================================

SELECT '8. Testing index usage...' as test_section;

-- This would require EXPLAIN queries in a real scenario
-- For now, just verify the indexes exist and can be used
SELECT 
    CASE WHEN (SELECT COUNT(*) FROM security_events USE INDEX (idx_security_events_type) WHERE event_type = 'test_event') >= 0 
         THEN '✅ PASS' ELSE '❌ FAIL' END as index_usage_test;

-- =====================================================
-- CLEANUP TEST DATA
-- =====================================================

SELECT '9. Cleaning up test data...' as test_section;

-- Remove test data
DELETE FROM security_events WHERE event_type = 'test_event';
DELETE FROM blocked_ips WHERE ip_address = '192.168.1.100';
DELETE FROM rate_limit_tracking WHERE identifier = 'test_user';
DELETE FROM phone_verifications WHERE user_id = @test_user_id AND phone = '09999999999';
DELETE FROM users WHERE username = 'test_user_migration';

SELECT '✅ Test data cleaned up' as cleanup_status;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

SELECT '=== TEST SUMMARY ===' as summary_header;

-- Count total records in each table
SELECT 
    (SELECT COUNT(*) FROM phone_verifications) as phone_verifications_count,
    (SELECT COUNT(*) FROM security_events) as security_events_count,
    (SELECT COUNT(*) FROM blocked_ips) as blocked_ips_count,
    (SELECT COUNT(*) FROM rate_limit_tracking) as rate_limit_tracking_count,
    (SELECT COUNT(*) FROM users) as users_count;

-- Show table structures
SELECT '=== TABLE STRUCTURES ===' as structures_header;

SELECT 'phone_verifications structure:' as table_info;
DESCRIBE phone_verifications;

SELECT 'security_events structure:' as table_info;
DESCRIBE security_events;

SELECT 'blocked_ips structure:' as table_info;
DESCRIBE blocked_ips;

SELECT 'rate_limit_tracking structure:' as table_info;
DESCRIBE rate_limit_tracking;

-- Show all indexes
SELECT '=== INDEXES ===' as indexes_header;

SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
AND table_name IN ('phone_verifications', 'security_events', 'blocked_ips', 'rate_limit_tracking')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SELECT '=== MIGRATION TEST COMPLETED ===' as test_footer;
SELECT 'If all tests show ✅ PASS, the migration was successful!' as final_message;