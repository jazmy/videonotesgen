const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.get('/', async (req, res) => {
  const docsPath = path.join(__dirname, '../', 'docs');
  console.log("docsPath", docsPath);
  let folders = [];

  try {
    const files = await fs.readdir(docsPath);
    for (let file of files) {
      const filePath = path.join(docsPath, file);
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        const subFiles = await fs.readdir(filePath);
        if (subFiles.includes('slidesGoal.json')) {
          folders.push(file);
        }
      }
    }
    res.status(200).json({ folders: folders });
  } catch (err) {
    console.error("Error reading directory or file stats:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
