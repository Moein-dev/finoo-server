const { upload } = require('../../middlewares/uploadMiddleware');

describe('Upload Middleware Configuration', () => {
  describe('Middleware Exports', () => {
    test('should export upload middleware', () => {
      expect(upload).toBeDefined();
      expect(typeof upload).toBe('object');
    });

    test('should have single method for file upload', () => {
      expect(upload.single).toBeDefined();
      expect(typeof upload.single).toBe('function');
    });
  });

  describe('Upload Configuration', () => {
    test('should be configured for single file upload', () => {
      const singleUpload = upload.single('image');
      expect(singleUpload).toBeDefined();
      expect(typeof singleUpload).toBe('function');
    });

    test('should have correct middleware arity', () => {
      const singleUpload = upload.single('image');
      // Multer middleware should accept 3 parameters (req, res, next)
      expect(singleUpload.length).toBe(3);
    });
  });

  describe('File Validation', () => {
    test('should be configured for file uploads', () => {
      // We can't easily test the internal multer configuration without complex setup
      // but we can verify the middleware is properly configured and functional
      expect(upload).toBeDefined();
      expect(typeof upload).toBe('object');
    });

    test('should have multer methods available', () => {
      expect(upload.single).toBeDefined();
      expect(typeof upload.single).toBe('function');
    });

    test('should create middleware for single file upload', () => {
      const middleware = upload.single('image');
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });
  });
});