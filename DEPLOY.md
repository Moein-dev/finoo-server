# Deployment Guide

## Prerequisites
1. Node.js v16 or higher
2. MySQL 8.0 or higher
3. PM2 (for process management)

## Server Setup Steps

### 1. Database Setup
```bash
# Login to MySQL
mysql -u root -p

# Run the setup script
source migrations/setup_database.sql
```

### 2. Environment Variables
Create `.env` file with these variables:
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=finoo_db
SECRET_KEY=your_jwt_secret
REFRESH_SECRET_KEY=your_refresh_secret
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Server
```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start the server with PM2
pm2 start ecosystem.config.js
```

### 5. Verify Installation
```bash
# Check if server is running
curl http://localhost:3000/api/test-status

# Check logs
pm2 logs finoo-server
```

## Troubleshooting

### Database Connection Issues
1. Check if MySQL is running
2. Verify database credentials in `.env`
3. Ensure database and tables are created

### API Issues
1. Check PM2 logs for errors
2. Verify all required environment variables
3. Check if data sources are accessible

## Monitoring

### Server Status
```bash
pm2 status
pm2 monit
```

### Database Status
```sql
-- Check data sources
SELECT * FROM data_sources WHERE active = true;

-- Check recent fetches
SELECT * FROM fetch_stats ORDER BY timestamp DESC LIMIT 5;
```

## Backup
Remember to set up regular backups for:
1. Database (especially the `hourly_prices` table)
2. Environment configuration
3. Custom source configurations

## Security Notes
1. Use strong passwords for database
2. Keep JWT secrets secure
3. Consider rate limiting for production
4. Set up SSL/TLS for production 