const express = require('express');
const router = express.Router();
const getNotesTitles = require('../../../api/getnotestitles');
const generateTextNotes = require('../../../api/generatetextnotes');
const path = require('path');
const fs = require('fs').promises;

// Get notes titles
router.get('/titles', async (req, res, next) => {
  try {
    const titles = await getNotesTitles.getTitles();
    res.json(titles);
  } catch (err) {
    next(err);
  }
});

// Generate text notes
router.post('/generate', async (req, res, next) => {
  try {
    const result = await generateTextNotes.generateNotes(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get note content
router.get('/:noteId', async (req, res, next) => {
  try {
    const noteId = req.params.noteId;
    const notePath = path.join(__dirname, '../../../../docs', `${noteId}.md`);
    
    try {
      const content = await fs.readFile(notePath, 'utf8');
      res.json({ content });
    } catch (error) {
      if (error.code === 'ENOENT') {
        const err = new Error('Note not found');
        err.type = 'NotFoundError';
        throw err;
      }
      throw error;
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
