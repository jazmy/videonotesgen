const express = require('express');
const router = express.Router();
const upload = require('../../../middleware/fileUpload');
const { sanitizeFilename } = require('../../../utils/fileHelper');
const path = require('path');
const fs = require('fs');

// Import services
const videoService = require('../../../services/videoService');
const generateTranscript = require('../../../api/generatetranscript');
const generateSlides = require('../../../api/generateslides');
const generateScreenshots = require('../../../api/generatescreenshots');

// Get video titles
router.get('/titles', async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const docsDir = path.join(__dirname, '../../../docs');
    
    // Get all directories in docs folder
    const items = fs.readdirSync(docsDir, { withFileTypes: true });
    const transcriptions = items
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(dir => dir.name);

    console.log('Found transcriptions:', transcriptions);
    res.json({ transcriptions });
  } catch (err) {
    console.error('Error getting video titles:', err);
    next(err);
  }
});

// Get file status
router.get('/status/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    console.log('Checking status for video:', videoId);
    
    const status = await videoService.checkFileStatus(videoId);
    console.log('Status:', status);
    
    res.json(status);
  } catch (err) {
    console.error('Error checking file status:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to check file status'
    });
  }
});

// List files in a directory
router.get('/list-files/:videoId/:subdir?', async (req, res, next) => {
  try {
    const { videoId, subdir } = req.params;
    console.log(`Listing files for video: ${videoId}, subdir: ${subdir || 'root'}`);
    
    // Construct the path to the directory
    let dirPath;
    if (subdir) {
      dirPath = path.join(__dirname, '../../../docs', videoId, subdir);
    } else {
      dirPath = path.join(__dirname, '../../../docs', videoId);
    }
    
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({
        success: false,
        error: 'Directory not found'
      });
    }
    
    // Get all files in the directory
    const files = fs.readdirSync(dirPath);
    
    res.json({
      success: true,
      files: files
    });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to list files'
    });
  }
});

// Upload video
router.post('/upload', upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.type = 'ValidationError';
      throw error;
    }

    // Create a unique subfolder for this video
    const timestamp = Date.now();
    const filenameWithoutExtension = path.parse(req.file.originalname).name;
    const subfolder = `${timestamp}-${sanitizeFilename(filenameWithoutExtension)}`;
    const uploadDir = path.join(__dirname, '../../../docs', subfolder);

    // Ensure the upload directory exists
    await require('fs').promises.mkdir(uploadDir, { recursive: true });

    // Move the uploaded file to the subfolder
    const finalPath = path.join(uploadDir, 'video', req.file.originalname);
    await require('fs').promises.mkdir(path.join(uploadDir, 'video'), { recursive: true });
    await require('fs').promises.rename(req.file.path, finalPath);

    res.json({
      message: 'File uploaded successfully',
      subfolder: subfolder,
      filename: req.file.originalname,
      path: finalPath
    });
  } catch (err) {
    // Clean up the uploaded file if something went wrong
    if (req.file && req.file.path) {
      try {
        await require('fs').promises.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    next(err);
  }
});

// Generate transcript
router.post('/:videoId/transcript', async (req, res, next) => {
  try {
    const result = await generateTranscript.generateTranscript(req.params.videoId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Generate video notes
router.post('/notes', async (req, res, next) => {
  try {
    console.log('Generating notes for video:', req.body);
    const { videoId, format } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ 
        success: false,
        error: 'Video ID is required' 
      });
    }

    console.log('Calling video service...');
    const result = await videoService.generateNotes(videoId, format);
    console.log('Notes generated:', result);

    const response = {
      success: true,
      message: 'Notes generated successfully',
      downloadUrl: `/download/zip/${videoId}`,
      error: null
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (err) {
    console.error('Error generating notes:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate notes'
    });
  }
});

// Generate slides
router.post('/:videoId/slides', async (req, res, next) => {
  try {
    const result = await generateSlides.generateSlides(req.params.videoId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Generate screenshots
router.post('/:videoId/screenshots', async (req, res, next) => {
  try {
    const result = await generateScreenshots.generateScreenshots(req.params.videoId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Download endpoint
router.get('/download/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const zipFile = path.join(__dirname, '../../../docs', videoId, 'zip', 'transcript.zip');
    
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

module.exports = router;
