const db = require('../../config/db');
const {
  createPhoneVerification,
  getValidPhoneVerification,
  markOTPAsUsed,
  incrementFailedAttempts
} = require('../../services/databaseService');

describe('OTP One-Time Use Logic', () => {
  let testUserId = 1;
  let testPhone = '+989999999999';
  let testCode = '123456';
  let verificationId;

  beforeAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM phone_verifications WHERE phone = ?', [testPhone]);
    await db.query('DELETE FROM users WHERE phone = ?', [testPhone]);
    
    // Create test user
    const [userResult] = await db.query(
      'INSERT INTO users (username, phone) VALUES (?, ?)',
      [`test_user_${Date.now()}`, testPhone]
    );
    testUserId = userResult.insertId;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM phone_verifications WHERE phone = ?', [testPhone]);
    await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
  });

  beforeEach(async () => {
    // Clean up any existing verifications
    await db.query('DELETE FROM phone_verifications WHERE phone = ?', [testPhone]);
  });

  describe('OTP Creation and Validation', () => {
    test('should create OTP with is_used = false and attempts = 0', async () => {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
      
      await createPhoneVerification(testUserId, testPhone, testCode, expiresAt);
      
      const [rows] = await db.query(
        'SELECT * FROM phone_verifications WHERE phone = ? AND code = ?',
        [testPhone, testCode]
      );
      
      expect(rows).toHaveLength(1);
      expect(rows[0].is_used).toBe(0); // false
      expect(rows[0].attempts).toBe(0);
      expect(rows[0].code).toBe(testCode);
      
      verificationId = rows[0].id;
    });

    test('should return valid OTP when not used and not expired', async () => {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
      
      await createPhoneVerification(testUserId, testPhone, testCode, expiresAt);
      
      const verification = await getValidPhoneVerification(testUserId, testPhone, testCode);
      
      expect(verification).toBeTruthy();
      expect(verification.code).toBe(testCode);
      expect(verification.is_used).toBe(0);
    });

    test('should not return OTP when already used', async () => {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
      
      await createPhoneVerification(testUserId, testPhone, testCode, expiresAt);
      
      // Get the verification ID
      const [rows] = await db.query(
        'SELECT id FROM phone_verifications WHERE phone = ? AND code = ?',
        [testPhone, testCode]
      );
      verificationId = rows[0].id;
      
      // Mark as used
      await markOTPAsUsed(verificationId);
      
      // Try to get valid verification - should return null
      const verification = await getValidPhoneVerification(testUserId, testPhone, testCode);
      
      expect(verification).toBeFalsy();
    });

    test('should not return expired OTP', async () => {
      const expiredTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      await createPhoneVerification(testUserId, testPhone, testCode, expiredTime);
      
      const verification = await getValidPhoneVerification(testUserId, testPhone, testCode);
      
      expect(verification).toBeFalsy();
    });
  });

  describe('OTP Usage Tracking', () => {
    test('should mark OTP as used', async () => {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
      
      await createPhoneVerification(testUserId, testPhone, testCode, expiresAt);
      
      // Get the verification ID
      const [rows] = await db.query(
        'SELECT id FROM phone_verifications WHERE phone = ? AND code = ?',
        [testPhone, testCode]
      );
      verificationId = rows[0].id;
      
      // Mark as used
      await markOTPAsUsed(verificationId);
      
      // Check if marked as used
      const [usedRows] = await db.query(
        'SELECT is_used FROM phone_verifications WHERE id = ?',
        [verificationId]
      );
      
      expect(usedRows[0].is_used).toBe(1); // true
    });

    test('should increment failed attempts', async () => {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
      
      await createPhoneVerification(testUserId, testPhone, testCode, expiresAt);
      
      // Increment failed attempts
      await incrementFailedAttempts(testUserId, testPhone);
      
      // Check attempts count
      const [rows] = await db.query(
        'SELECT attempts FROM phone_verifications WHERE phone = ? AND code = ?',
        [testPhone, testCode]
      );
      
      expect(rows[0].attempts).toBe(1);
      
      // Increment again
      await incrementFailedAttempts(testUserId, testPhone);
      
      // Check attempts count again
      const [rows2] = await db.query(
        'SELECT attempts FROM phone_verifications WHERE phone = ? AND code = ?',
        [testPhone, testCode]
      );
      
      expect(rows2[0].attempts).toBe(2);
    });
  });

  describe('Complete OTP Flow', () => {
    test('should complete full OTP verification flow', async () => {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
      
      // 1. Create OTP
      await createPhoneVerification(testUserId, testPhone, testCode, expiresAt);
      
      // 2. Verify OTP is valid
      let verification = await getValidPhoneVerification(testUserId, testPhone, testCode);
      expect(verification).toBeTruthy();
      expect(verification.is_used).toBe(0);
      
      // 3. Mark as used
      await markOTPAsUsed(verification.id);
      
      // 4. Verify OTP is no longer valid
      verification = await getValidPhoneVerification(testUserId, testPhone, testCode);
      expect(verification).toBeFalsy();
      
      // 5. Verify database state
      const [finalRows] = await db.query(
        'SELECT is_used FROM phone_verifications WHERE phone = ? AND code = ?',
        [testPhone, testCode]
      );
      
      expect(finalRows[0].is_used).toBe(1);
    });
  });
});