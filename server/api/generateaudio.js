const express = require('express');
const router = express.Router();
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const fs = require("fs");
const path = require("path");

router.post('/', async function(req, res) {
	if (req.method === "POST") {
		const subfolder = req.body.subfolder;
        const filename = req.body.filename;
        const videoPath = path.resolve(__dirname, "../docs", subfolder, "video", filename);
        console.log("video : ", videoPath);

		const dirPath = path.resolve(__dirname, "../docs", subfolder, "audio");
		fs.mkdirSync(dirPath, { recursive: true });
		const audioFilename = filename.split('.')[0] + '.wav'

		const audioOutput = path.resolve(dirPath, audioFilename);

		let ffmpegProcess = ffmpeg(videoPath)
			.audioFrequency(16000)
			.audioChannels(1)
			.output(audioOutput)
			.on('end', function() {
				console.log('Audio conversion completed');
				res.status(200).json({ message: "Audio created successfully.", subfolder: subfolder, filename: audioFilename });
			})
			.on('error', function(err) {
				console.log('An error occurred: ' + err.message);
				res.status(500).json({ error: "An error occurred during audio conversion." });
			})
			.run();
	} else {
		res.status(405).json({ error: "Method not allowed. Use POST." });
	}
});

module.exports = router;
