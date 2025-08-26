const request = require("supertest");
const app = require("../../server");
const db = require("../../config/db");

describe("OTP Security Enhancements", () => {
  let testUserId;
  let baseTestPhone = "+989123456";

  beforeAll(async () => {
    // Clean up test data for all test phones
    await db.query("DELETE FROM phone_verifications WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
    await db.query("DELETE FROM users WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
  });

  afterAll(async () => {
    // Clean up test data for all test phones
    await db.query("DELETE FROM phone_verifications WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
    await db.query("DELETE FROM users WHERE phone LIKE ?", [
      baseTestPhone + "%",
    ]);
  });

  describe("OTP Generation", () => {
    test("should generate 6-digit OTP", async () => {
      const testPhone = baseTestPhone + "001";
      const response = await request(app)
        .post("/api/auth/send-code")
        .send({ phone: testPhone });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);

      // Check database for 6-digit code
      const [rows] = await db.query(
        "SELECT code FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );

      expect(rows[0].code).toMatch(/^\d{6}$/); // 6 digits
    });

    test("should set expiry to 2 minutes", async () => {
      const testPhone = baseTestPhone + "002";
      await request(app).post("/api/auth/send-code").send({ phone: testPhone });

      const [rows] = await db.query(
        "SELECT expires_at, created_at FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );

      const createdAt = new Date(rows[0].created_at);
      const expiresAt = new Date(rows[0].expires_at);
      const diffMinutes = (expiresAt - createdAt) / (1000 * 60);

      // Allow for small timing differences (within 0.1 minutes)
      expect(diffMinutes).toBeCloseTo(2, 1);
    });
  });

  describe("One-time Use Logic", () => {
    let otpCode;
    let testPhone;

    test("should allow OTP to be used once successfully", async () => {
      testPhone = baseTestPhone + "003";

      // Generate fresh OTP
      await request(app).post("/api/auth/send-code").send({ phone: testPhone });

      const [rows] = await db.query(
        "SELECT code FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );
      otpCode = rows[0].code;

      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({ phone: testPhone, code: otpCode });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(response.body.data.authentication).toBeDefined();
    });

    test("should reject already used OTP", async () => {
      testPhone = baseTestPhone + "004";

      // Generate fresh OTP
      await request(app).post("/api/auth/send-code").send({ phone: testPhone });

      const [rows] = await db.query(
        "SELECT code FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );
      otpCode = rows[0].code;

      // Use OTP first time
      await request(app)
        .post("/api/auth/verify-code")
        .send({ phone: testPhone, code: otpCode });

      // Try to use same OTP again
      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({ phone: testPhone, code: otpCode });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe(400);
      expect(response.body.error).toContain("قبلاً استفاده شده");
    });

    test("should track failed attempts", async () => {
      testPhone = baseTestPhone + "005";

      // Generate fresh OTP
      await request(app).post("/api/auth/send-code").send({ phone: testPhone });

      // Try with wrong code
      await request(app)
        .post("/api/auth/verify-code")
        .send({ phone: testPhone, code: "000000" });

      // Check attempts count in database
      const [rows] = await db.query(
        "SELECT attempts FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );

      expect(rows[0].attempts).toBe(1);
    });

    test("should mark OTP as used after successful verification", async () => {
      testPhone = baseTestPhone + "006";

      // Generate fresh OTP
      await request(app).post("/api/auth/send-code").send({ phone: testPhone });

      const [rows] = await db.query(
        "SELECT code FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [testPhone]
      );
      otpCode = rows[0].code;

      await request(app)
        .post("/api/auth/verify-code")
        .send({ phone: testPhone, code: otpCode });

      // Check is_used flag in database
      const [usedRows] = await db.query(
        "SELECT is_used FROM phone_verifications WHERE phone = ? AND code = ?",
        [testPhone, otpCode]
      );

      expect(usedRows[0].is_used).toBe(1); // MySQL boolean true = 1
    });
  });

  describe("Expired OTP Handling", () => {
    test("should reject expired OTP", async () => {
      const testPhone = baseTestPhone + "007";

      // Create expired OTP manually
      const expiredCode = "123456";
      const expiredTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      const [userResult] = await db.query(
        "INSERT INTO users (username, phone) VALUES (?, ?) ON DUPLICATE KEY UPDATE phone = VALUES(phone)",
        [`test_user_${Date.now()}`, testPhone]
      );

      await db.query(
        "INSERT INTO phone_verifications (user_id, phone, code, expires_at) VALUES (?, ?, ?, ?)",
        [userResult.insertId || 1, testPhone, expiredCode, expiredTime]
      );

      const response = await request(app)
        .post("/api/auth/verify-code")
        .send({ phone: testPhone, code: expiredCode });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe(400);
    });
  });
});
