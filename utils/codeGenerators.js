const crypto = require('crypto');

/**
 * Code Generation Utilities
 * Centralized functions for generating secure codes and usernames
 */

/**
 * Generate secure 6-digit OTP using crypto.randomInt
 * @returns {string} 6-digit OTP code
 */
function generateSecureOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate random username with user_ prefix
 * @returns {string} Random username
 */
function generateRandomUsername() {
  return `user_${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Generate secure token for email verification
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Hex token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  generateSecureOTP,
  generateRandomUsername,
  generateSecureToken
};