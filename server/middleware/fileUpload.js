const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');
const { sanitizeFilename } = require('../utils/fileHelper');

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.access(config.fileUpload.uploadDir);
  } catch (error) {
    await fs.mkdir(config.fileUpload.uploadDir, { recursive: true });
  }
};

// Initialize upload directory
ensureUploadDir().catch(console.error);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, config.fileUpload.uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename for now, it will be moved to proper subfolder later
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  try {
    // Check file type
    if (!config.fileUpload.allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type. Only video files are allowed.');
      error.type = 'ValidationError';
      return cb(error, false);
    }

    // Check file size (2GB limit)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
    if (parseInt(req.headers['content-length']) > maxSize) {
      const error = new Error('File size exceeds 2GB limit');
      error.type = 'ValidationError';
      return cb(error, false);
    }

    cb(null, true);
  } catch (error) {
    console.error('File filter error:', error);
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.fileUpload.maxSize, // 2GB from config
    files: 1 // Only allow one file per request
  }
});

module.exports = upload;
