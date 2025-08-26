const multer = require("multer");
const path = require("path");
const { UPLOAD_CONFIG } = require("../config/constants");

/**
 * Upload middleware configuration for profile images
 * Handles file upload with validation and security checks
 */

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_CONFIG.UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const filename = `user_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, filename);
  },
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    !UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    !UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(fileExtension)
  ) {
    return cb(
      new Error("نوع فایل نامعتبر است. فقط JPEG، PNG و JPG مجاز هستند."),
      false
    );
  }
  cb(null, true);
};

// Upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE },
});

module.exports = {
  upload
};