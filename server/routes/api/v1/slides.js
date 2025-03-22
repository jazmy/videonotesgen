const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const generateSlides = require('../../../api/generateslides');

// Generate slides
router.post('/generate', async (req, res, next) => {
  try {
    const result = await generateSlides.generateSlides(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get slides
router.get('/:slideId', async (req, res, next) => {
  try {
    const slideId = req.params.slideId;
    const slidePath = path.join(__dirname, '../../../../docs', slideId, 'presentation.pptx');
    
    try {
      await fs.access(slidePath);
      res.download(slidePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const err = new Error('Slides not found');
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
