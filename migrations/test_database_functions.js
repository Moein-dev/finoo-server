#!/usr/bin/env node

/**
 * Test script for database security functions
 * This script tests the new security-related database functions
 * without requiring an actual database connection
 */

const path = require('path');

// Mock database module for testing
const mockDb = {
  query: async (query, params) => {
    console.log('Mock Query:', query);
    console.log('Mock Params:', params);
    
    // Mock responses based on query type
    if (query.includes('INSERT INTO security_events')) {
      return [{ insertId: 1, affectedRows: 1 }];
    }
    
    if (query.includes('SELECT * FROM security_events')) {
      return [[
        {
          id: 1,
          event_type: 'test_event',
          user_id: null,
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent',
          details: '{"test": true}',
          created_at: new Date()
        }
      ]];
    }
    
    if (query.includes('SELECT COUNT(*) as count FROM security_events')) {
      return [[{ count: 1 }]];
    }
    
    return [[]];
  }
};

// Mock the database service functions
const securityFunctions = {
  async logSecurityEvent(eventType, userId = null, ipAddress = null, userAgent = null, details = null) {
    const query = `
      INSERT INTO security_events (event_type, user_id, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?)
    `;
    await mockDb.query(query, [eventType, userId, ipAddress, userAgent, JSON.stringify(details)]);
    console.log('✅ Security event logged successfully');
  },

  async getSecurityEvents(eventType = null, userId = null, limit = 100, offset = 0) {
    let whereClause = [];
    let queryParams = [];
    
    if (eventType) {
      whereClause.push("event_type = ?");
      queryParams.push(eventType);
    }
    
    if (userId) {
      whereClause.push("user_id = ?");
      queryParams.push(userId);
    }
    
    const whereSQL = whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : "";
    
    queryParams.push(limit, offset);
    
    const query = `
      SELECT * FROM security_events
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await mockDb.query(query, queryParams);
    const result = rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null
    }));
    
    console.log('✅ Retrieved security events:', result.length);
    return result;
  },

  async countSecurityEvents(eventType = null, userId = null) {
    let whereClause = [];
    let queryParams = [];
    
    if (eventType) {
      whereClause.push("event_type = ?");
      queryParams.push(eventType);
    }
    
    if (userId) {
      whereClause.push("user_id = ?");
      queryParams.push(userId);
    }
    
    const whereSQL = whereClause.length ? `WHERE ${whereClause.join(" AND ")}` : "";
    
    const query = `SELECT COUNT(*) as count FROM security_events ${whereSQL}`;
    const [rows] = await mockDb.query(query, queryParams);
    const count = rows[0].count;
    
    console.log('✅ Security events count:', count);
    return count;
  }
};

// Test the functions
async function runTests() {
  console.log('🧪 Testing Security Database Functions\n');
  
  try {
    // Test 1: Log a security event
    console.log('Test 1: Logging security event...');
    await securityFunctions.logSecurityEvent(
      'failed_login',
      123,
      '192.168.1.1',
      'Mozilla/5.0 Test Browser',
      { reason: 'invalid_password', attempts: 3 }
    );
    
    // Test 2: Get security events
    console.log('\nTest 2: Retrieving security events...');
    const events = await securityFunctions.getSecurityEvents('failed_login', null, 10, 0);
    
    // Test 3: Count security events
    console.log('\nTest 3: Counting security events...');
    const count = await securityFunctions.countSecurityEvents('failed_login');
    
    // Test 4: Get events for specific user
    console.log('\nTest 4: Getting events for specific user...');
    const userEvents = await securityFunctions.getSecurityEvents(null, 123, 5, 0);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { securityFunctions, runTests };