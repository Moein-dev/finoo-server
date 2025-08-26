# Security Enhancements Database Migration Guide

## Overview

This guide provides step-by-step instructions for deploying security-related database changes to the Finoo API database.

## Migration Files

1. **`add_otp_security_fields.sql`** - Main migration with all changes
2. **`create_security_events_table.sql`** - Separate script for security_events table
3. **`deploy_security_enhancements.sql`** - Complete deployment script with safety checks
4. **`rollback_security_enhancements.sql`** - Rollback script (use with caution)
5. **`test_security_migrations.sql`** - Test script to verify changes

## Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] Application maintenance mode enabled (if applicable)
- [ ] Database connection credentials verified
- [ ] Migration scripts reviewed and approved

## Deployment Steps

### Step 1: Backup Database

```bash
# Create a backup before applying migrations
mysqldump -u [username] -p [database_name] > backup_before_security_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Test in Development Environment

```bash
# Apply migrations to development database first
mysql -u [dev_username] -p [dev_database] < migrations/deploy_security_enhancements.sql

# Run tests to verify
mysql -u [dev_username] -p [dev_database] < migrations/test_security_migrations.sql
```

### Step 3: Apply to Production

```bash
# Apply the complete deployment script
mysql -u [prod_username] -p [prod_database] < migrations/deploy_security_enhancements.sql
```

### Step 4: Verify Deployment

```bash
# Run verification tests
mysql -u [prod_username] -p [prod_database] < migrations/test_security_migrations.sql
```

## Changes Applied

### phone_verifications Table

- **New Column**: `is_used` (BOOLEAN, DEFAULT FALSE) - Tracks if OTP has been used
- **New Column**: `attempts` (INT, DEFAULT 0) - Tracks failed verification attempts
- **New Index**: `idx_phone_verifications_is_used` - Performance optimization
- **New Index**: `idx_phone_verifications_attempts` - Performance optimization

### security_events Table (New)

- **Purpose**: Log security-related events for monitoring and analysis
- **Columns**:
  - `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
  - `event_type` (VARCHAR(100), NOT NULL) - Type of security event
  - `user_id` (INT, NULL) - Related user ID (foreign key to users.id)
  - `ip_address` (VARCHAR(45), NULL) - Client IP address (IPv6 compatible)
  - `user_agent` (TEXT, NULL) - Client user agent string
  - `details` (JSON, NULL) - Additional event details
  - `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

### Indexes Created

- `idx_security_events_type` - Query by event type
- `idx_security_events_user` - Query by user
- `idx_security_events_created` - Query by date
- `idx_security_events_type_created` - Composite index for type + date queries
- `idx_security_events_ip` - Query by IP address

## Security Event Types

The following event types are recommended for logging:

- `failed_login` - Failed authentication attempts
- `rate_limit_exceeded` - Rate limiting triggered
- `otp_failed` - OTP verification failed
- `otp_expired` - OTP expired during verification
- `invalid_token` - Invalid JWT token used
- `suspicious_activity` - Suspicious user behavior detected

## Rollback Procedure

⚠️ **WARNING**: Rollback will permanently delete security event logs and OTP tracking data.

```bash
# Only if absolutely necessary
mysql -u [username] -p [database] < migrations/rollback_security_enhancements.sql
```

## Post-Deployment Tasks

1. **Update Application Code**: Ensure the application code is updated to use the new database fields
2. **Monitor Logs**: Check application logs for any database-related errors
3. **Test Security Features**: Verify OTP one-time use and security logging work correctly
4. **Performance Monitoring**: Monitor database performance with new indexes

## Troubleshooting

### Common Issues

1. **Column Already Exists Error**
   - The deployment script includes safety checks to prevent this
   - If using individual scripts, check if columns exist first

2. **Foreign Key Constraint Error**
   - Ensure the `users` table exists and has the correct structure
   - Verify database user has necessary privileges

3. **Index Creation Failed**
   - Check if indexes already exist
   - Verify table has data that might conflict with index creation

### Verification Queries

```sql
-- Check if new columns exist
DESCRIBE phone_verifications;

-- Check if security_events table exists
DESCRIBE security_events;

-- Verify indexes
SHOW INDEX FROM phone_verifications;
SHOW INDEX FROM security_events;

-- Test security event logging
INSERT INTO security_events (event_type, ip_address) VALUES ('test', '127.0.0.1');
SELECT * FROM security_events WHERE event_type = 'test';
DELETE FROM security_events WHERE event_type = 'test';
```

## Support

If you encounter issues during deployment:

1. Check the database error logs
2. Verify all prerequisites are met
3. Ensure database user has sufficient privileges
4. Contact the development team with specific error messages

## Environment Variables

After deployment, ensure these environment variables are configured:

- Database connection settings remain unchanged
- Security logging is enabled in the application configuration
- Rate limiting settings are properly configured

## Performance Considerations

- The new indexes will improve query performance for security-related operations
- The security_events table may grow large over time - consider implementing log rotation
- Monitor database performance after deployment and adjust indexes if needed