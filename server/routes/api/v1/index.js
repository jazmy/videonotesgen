const express = require('express');
const router = express.Router();

// Import original API handlers
const generateTranscript = require('../../../api/generatetranscript');
const generateVideoNotes = require('../../../api/generatevideonotes');
const generateSlides = require('../../../api/generateslides');
const generateScreenshots = require('../../../api/generatescreenshots');
const generateTextNotes = require('../../../api/generatetextnotes');
const generateAudio = require('../../../api/generateaudio');
const chatGPT = require('../../../api/chatgpt');
const getVideoTitles = require('../../../api/getvideotitles');
const getNotesTitles = require('../../../api/getnotestitles');

// Map all original endpoints
router.use('/videos', require('./videos'));
router.use('/notes', require('./notes'));
router.use('/slides', require('./slides'));

// Chat endpoints
router.use('/chat', chatGPT);

// Audio endpoints
router.use('/videos/audio', generateAudio);

// Processing endpoints
router.use('/generatescreenshots', generateScreenshots);
router.use('/generatetranscript', generateTranscript);
router.use('/generateaudio', generateAudio);
router.use('/generatetextnotes', generateTextNotes);

// Ensure backward compatibility
router.use('/chatgpt', chatGPT);
router.use('/generateaudio', generateAudio);
router.use('/generatetextnotes', generateTextNotes);

module.exports = router;
