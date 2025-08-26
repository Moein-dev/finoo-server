const {
  validateSecretKeyStrength,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  refreshAccessToken,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
} = require('../../utils/jwtSecurity');

// Import jwt directly for testing
const jwt = require('jsonwebtoken');

describe('JWT Security Utils', () => {
  // Store original environment variables
  const originalSecretKey = process.env.SECRET_KEY;
  const originalRefreshSecretKey = process.env.REFRESH_SECRET_KEY;

  beforeEach(() => {
    // Set test environment variables
    process.env.SECRET_KEY = 'test-secret-key-that-is-at-least-32-characters-long-for-testing';
    process.env.REFRESH_SECRET_KEY = 'test-refresh-secret-key-that-is-at-least-32-characters-long-for-testing';
  });

  afterEach(() => {
    // Restore original environment variables
    process.env.SECRET_KEY = originalSecretKey;
    process.env.REFRESH_SECRET_KEY = originalRefreshSecretKey;
  });

  describe('validateSecretKeyStrength', () => {
    test('should validate strong secret key', () => {
      const strongKey = 'this-is-a-very-strong-secret-key-with-more-than-32-characters';
      expect(() => validateSecretKeyStrength(strongKey)).not.toThrow();
      expect(validateSecretKeyStrength(strongKey)).toBe(true);
    });

    test('should throw error for weak secret key', () => {
      const weakKey = 'short';
      expect(() => validateSecretKeyStrength(weakKey)).toThrow('JWT secret key must be at least 32 characters long');
    });

    test('should throw error for empty secret key', () => {
      expect(() => validateSecretKeyStrength('')).toThrow('JWT secret key is required');
      expect(() => validateSecretKeyStrength(null)).toThrow('JWT secret key is required');
      expect(() => validateSecretKeyStrength(undefined)).toThrow('JWT secret key is required');
    });
  });

  describe('generateAccessToken', () => {
    test('should generate valid access token', () => {
      const payload = { id: 1, username: 'testuser', role: 'user' };
      const token = generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.role).toBe(payload.role);
    });

    test('should throw error with weak secret key', () => {
      process.env.SECRET_KEY = 'weak';
      const payload = { id: 1, username: 'testuser' };
      
      expect(() => generateAccessToken(payload)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate valid refresh token', () => {
      const payload = { id: 1, username: 'testuser' };
      const token = generateRefreshToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.verify(token, process.env.REFRESH_SECRET_KEY);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.username).toBe(payload.username);
    });

    test('should throw error with weak secret key', () => {
      process.env.REFRESH_SECRET_KEY = 'weak';
      const payload = { id: 1, username: 'testuser' };
      
      expect(() => generateRefreshToken(payload)).toThrow();
    });
  });

  describe('generateTokenPair', () => {
    test('should generate both access and refresh tokens', () => {
      const userPayload = { id: 1, username: 'testuser', role: 'user' };
      const tokens = generateTokenPair(userPayload);
      
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('refresh_token');
      expect(typeof tokens.access_token).toBe('string');
      expect(typeof tokens.refresh_token).toBe('string');
      
      // Verify both tokens are valid
      const accessDecoded = jwt.verify(tokens.access_token, process.env.SECRET_KEY);
      const refreshDecoded = jwt.verify(tokens.refresh_token, process.env.REFRESH_SECRET_KEY);
      
      expect(accessDecoded.id).toBe(userPayload.id);
      expect(refreshDecoded.id).toBe(userPayload.id);
    });
  });

  describe('refreshAccessToken', () => {
    test('should refresh access token with valid refresh token', async () => {
      const userPayload = { id: 1, username: 'testuser', role: 'user' };
      const refreshToken = generateRefreshToken(userPayload);
      
      // Mock getUserById function
      const mockGetUserById = jest.fn().mockResolvedValue({
        id: 1,
        username: 'testuser',
        role: 'user'
      });
      
      const result = await refreshAccessToken(refreshToken, mockGetUserById);
      
      expect(result).toHaveProperty('access_token');
      expect(typeof result.access_token).toBe('string');
      
      // Verify new access token
      const decoded = jwt.verify(result.access_token, process.env.SECRET_KEY);
      expect(decoded.id).toBe(1);
      expect(decoded.username).toBe('testuser');
      expect(decoded.role).toBe('user');
    });

    test('should throw error if user not found', async () => {
      const userPayload = { id: 1, username: 'testuser' };
      const refreshToken = generateRefreshToken(userPayload);
      
      const mockGetUserById = jest.fn().mockResolvedValue(null);
      
      await expect(refreshAccessToken(refreshToken, mockGetUserById))
        .rejects.toThrow('Token refresh failed: User not found');
    });

    test('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid.token.here';
      const mockGetUserById = jest.fn();
      
      await expect(refreshAccessToken(invalidToken, mockGetUserById))
        .rejects.toThrow('Token refresh failed');
    });
  });

  describe('Token Configuration', () => {
    test('should have correct expiry constants', () => {
      expect(ACCESS_TOKEN_EXPIRY).toBeDefined();
      expect(REFRESH_TOKEN_EXPIRY).toBeDefined();
      expect(typeof ACCESS_TOKEN_EXPIRY).toBe('string');
      expect(typeof REFRESH_TOKEN_EXPIRY).toBe('string');
    });

    test('should generate tokens with correct expiry times', () => {
      const payload = { id: 1, username: 'testuser' };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      
      const accessDecoded = jwt.decode(accessToken);
      const refreshDecoded = jwt.decode(refreshToken);
      
      expect(accessDecoded.exp).toBeDefined();
      expect(refreshDecoded.exp).toBeDefined();
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed tokens gracefully', () => {
      const malformedTokens = [
        'not.a.token',
        'invalid',
        '',
        null,
        undefined
      ];

      malformedTokens.forEach(token => {
        expect(() => jwt.verify(token, process.env.SECRET_KEY)).toThrow();
      });
    });

    test('should validate secret key strength in token generation', () => {
      // Test with short secret key
      process.env.SECRET_KEY = 'short';
      expect(() => generateAccessToken({ id: 1 })).toThrow('JWT secret key must be at least 32 characters long');
      
      // Test with empty secret key
      process.env.SECRET_KEY = '';
      expect(() => generateAccessToken({ id: 1 })).toThrow('JWT secret key is required');
      
      // Restore original
      process.env.SECRET_KEY = originalSecretKey;
    });

    test('should handle token verification with different secrets', () => {
      const payload = { id: 1, username: 'testuser' };
      const token = generateAccessToken(payload);
      
      // Change secret key
      process.env.SECRET_KEY = 'different-secret-key-that-is-at-least-32-characters-long';
      
      expect(() => jwt.verify(token, process.env.SECRET_KEY)).toThrow();
    });
  });
});