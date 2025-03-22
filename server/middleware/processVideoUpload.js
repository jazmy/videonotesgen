const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sanitizeFilename } = require('../utils/fileHelper');

// Function to create a timestamp-based subfolder name
function createSubfolderName(originalFilename) {
    const timestamp = Date.now();
    const filenameWithoutExtension = sanitizeFilename(
        path.parse(originalFilename).name
    );
    return `${timestamp}-${filenameWithoutExtension}`;
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create subfolder path
        const subfolder = createSubfolderName(file.originalname);
        const dir = path.resolve(__dirname, `../docs/${subfolder}/video`);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        console.log(`Directory created at: ${dir}`);
        
        // Store subfolder in request for later use
        req.subfolder = subfolder;
        
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const sanitizedFilename = sanitizeFilename(file.originalname);
        console.log(`File being uploaded as: ${sanitizedFilename}`);
        
        // Store filename in request for later use
        req.filename = sanitizedFilename;
        
        cb(null, sanitizedFilename);
    }
});

// Configure file filter
const fileFilter = (req, file, cb) => {
    // Check file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.mimetype)) {
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
};

// Configure multer upload
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
        files: 1 // Only allow one file per request
    }
});

// Middleware that processes the upload and adds file info to the request
const processVideoUpload = (req, res, next) => {
    upload.single('video')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ 
                error: err.message || 'Error uploading file' 
            });
        }
        
        // If no file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Add subfolder and filename to the file object for easier access
        req.file.subfolder = req.subfolder;
        req.file.filename = req.filename;
        
        next();
    });
};

module.exports = processVideoUpload;
