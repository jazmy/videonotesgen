const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/', async (req, res) => {
    const docsPath = path.resolve(__dirname, '../docs');
    try {
        // Read all directories in the docs folder
        const directories = fs.readdirSync(docsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        // Filter directories that contain a transcript.txt file
        const directoriesWithTranscript = directories.filter(directory => {
            const transcriptPath = path.join(docsPath, directory, 'transcript.txt');
            return fs.existsSync(transcriptPath);
        });

        res.status(200).json({ transcriptions: directoriesWithTranscript });
    } catch (err) {
        console.error("Error getting directories with transcript:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
