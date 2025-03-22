const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Declare timestamp variable
let timestamp = Date.now();

function sanitizeFilename(filename) {
    // Extract the file extension
    let extension = path.extname(filename);
    // Extract the filename without extension
    let filenameWithoutExtension = path.basename(filename, extension);
    // Remove non-alphanumeric characters
    filenameWithoutExtension = filenameWithoutExtension.replace(/\W+/g, "");
    // Return sanitized filename
    return `${filenameWithoutExtension}${extension}`;
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Update timestamp for each upload
        timestamp = Date.now();
        
        // Create subfolder path
        const filenameWithoutExtension = sanitizeFilename(
            path.parse(file.originalname).name
        );
        const subfolder = `${timestamp}-${filenameWithoutExtension}`;
        const dir = path.resolve(__dirname, `../docs/${subfolder}/video`);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        console.log(`Directory created at: ${dir}`);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const sanitizedFilename = sanitizeFilename(file.originalname);
        console.log(`File being uploaded as: ${sanitizedFilename}`);
        cb(null, sanitizedFilename);
    }
});

// Configure multer upload
const upload = multer({ storage: storage });

// Upload endpoint
router.post('/', upload.single('video'), async (req, res) => {
    try {
        console.log('Upload request received');
        
        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get file details
        const filenameWithoutExtension = sanitizeFilename(
            path.parse(req.file.originalname).name
        );
        const subfolder = `${timestamp}-${filenameWithoutExtension}`;
        
        console.log('File uploaded successfully:', {
            subfolder,
            filename: req.file.filename,
            path: req.file.path
        });

        // Return success response
        return res.status(200).json({
            message: 'File uploaded successfully',
            subfolder: subfolder,
            filename: sanitizeFilename(req.file.originalname)
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json({ error: 'Error uploading file' });
    }
});

module.exports = router;
