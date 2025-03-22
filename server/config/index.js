require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  fileUpload: {
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB in bytes
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    uploadDir: process.env.UPLOAD_DIR || 'docs/'
  },
  security: {
    rateLimitRequests: 100,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  },
  aiSettings: {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  }
};
