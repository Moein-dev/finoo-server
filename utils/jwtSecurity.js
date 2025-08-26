const jwt = require("jsonwebtoken");

// JWT Security Configuration
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "7d";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "15d";

/**
 * Validate JWT secret key strength
 * @param {string} secretKey - The secret key to validate
 * @returns {boolean} - Returns true if valid
 * @throws {Error} - Throws error if invalid
 */
function validateSecretKeyStrength(secretKey) {
  if (!secretKey) {
    throw new Error("JWT secret key is required");
  }
  if (secretKey.length < 32) {
    throw new Error("JWT secret key must be at least 32 characters long");
  }
  return true;
}

/**
 * Generate access token
 * @param {Object} payload - Token payload containing user data
 * @returns {string} - Generated access token
 */
function generateAccessToken(payload) {
  validateSecretKeyStrength(process.env.SECRET_KEY);
  
  return jwt.sign(
    payload,
    process.env.SECRET_KEY,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload containing user data
 * @returns {string} - Generated refresh token
 */
function generateRefreshToken(payload) {
  validateSecretKeyStrength(process.env.REFRESH_SECRET_KEY);
  
  return jwt.sign(
    payload,
    process.env.REFRESH_SECRET_KEY,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify refresh token (internal use only)
 * @param {string} token - Token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - Throws error if token is invalid
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.REFRESH_SECRET_KEY);
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
}

/**
 * Generate token pair (access + refresh)
 * @param {Object} userPayload - User data for tokens
 * @returns {Object} - Object containing both tokens
 */
function generateTokenPair(userPayload) {
  const accessToken = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken({
    id: userPayload.id,
    username: userPayload.username
  });
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Valid refresh token
 * @param {Function} getUserById - Function to get user by ID
 * @returns {Object} - New access token
 * @throws {Error} - Throws error if refresh token is invalid
 */
async function refreshAccessToken(refreshToken, getUserById) {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get fresh user data
    const user = await getUserById(decoded.id);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Generate new access token with fresh user data
    const newAccessToken = generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role
    });
    
    return {
      access_token: newAccessToken
    };
  } catch (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}



module.exports = {
  validateSecretKeyStrength,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  refreshAccessToken,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};