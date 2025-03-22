const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    console.log('Request headers:', req.headers);
    next();
});

// Security middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitRequests
}));

// Body parsing middleware
app.use(express.json({ limit: config.fileUpload.maxSize }));
app.use(express.urlencoded({ extended: true, limit: config.fileUpload.maxSize }));
app.use(express.raw({ limit: config.fileUpload.maxSize }));

// Create docs directory if it doesn't exist
if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
    console.log('Created docs directory');
}

// Static file serving
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Upload routes
app.use('/uploadvideo', require('./api/uploadvideo'));
app.use('/processvideo', require('./middleware/processVideoUpload'), require('./api/processVideo'));
console.log('Upload routes registered');

// API Routes
app.use('/api/v1', require('./routes/api/v1'));
app.use('/api', require('./routes/api/v1')); // Backward compatibility

// Download routes
app.get('/download/zip/:videoId', async (req, res, next) => {
    try {
        const videoId = req.params.videoId;
        const zipFile = path.join(__dirname, 'docs', videoId, 'zip', 'transcript.zip');
        
        console.log('Looking for zip file at:', zipFile);
        if (!fs.existsSync(zipFile)) {
            console.error('Zip file not found at:', zipFile);
            const error = new Error('File not found');
            error.type = 'NotFoundError';
            throw error;
        }
        
        console.log('Sending zip file:', zipFile);
        res.download(zipFile, `${videoId}-notes.zip`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                next(err);
            }
        });
    } catch (err) {
        console.error('Download error:', err);
        next(err);
    }
});

// Add v1/videos/download/:videoId route
app.get('/v1/videos/download/:videoId', async (req, res, next) => {
    try {
        const videoId = req.params.videoId;
        const zipFile = path.join(__dirname, 'docs', videoId, 'zip', 'transcript.zip');
        
        console.log('Looking for zip file at:', zipFile);
        if (!fs.existsSync(zipFile)) {
            console.error('Zip file not found at:', zipFile);
            const error = new Error('File not found');
            error.type = 'NotFoundError';
            throw error;
        }
        
        console.log('Sending zip file:', zipFile);
        res.download(zipFile, `${videoId}-notes.zip`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                next(err);
            }
        });
    } catch (err) {
        console.error('Download error:', err);
        next(err);
    }
});

app.get('/download/notes/:videoId', async (req, res, next) => {
    try {
        const videoId = req.params.videoId;
        const rtfFile = path.join(__dirname, 'docs', videoId, 'rtf', 'transcript.rtf');
        
        console.log('Looking for file at:', rtfFile);
        if (!fs.existsSync(rtfFile)) {
            console.error('File not found at:', rtfFile);
            const error = new Error('File not found');
            error.type = 'NotFoundError';
            throw error;
        }
        
        console.log('Sending file:', rtfFile);
        res.download(rtfFile, `${videoId}-notes.rtf`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                next(err);
            }
        });
    } catch (err) {
        console.error('Download error:', err);
        next(err);
    }
});

app.get('/download/slides/:videoId', async (req, res, next) => {
    try {
        const videoId = req.params.videoId;
        const file = path.join(__dirname, `./docs/${videoId}/presentation.pptx`);
        
        if (!fs.existsSync(file)) {
            const error = new Error('File not found');
            error.type = 'NotFoundError';
            throw error;
        }
        
        res.download(file, (err) => {
            if (err) {
                next(err);
            }
        });
    } catch (err) {
        next(err);
    }
});

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(`Environment: ${config.environment}`);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = app;
