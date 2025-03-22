const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const whisper = require('whisper-node').default;
const { createTranscriptDocumentFromJson } = require('../utils/documentProcessing');

ffmpeg.setFfmpegPath(ffmpegPath);

// Whisper options
const options = {
  modelName: "base.en",
  whisperOptions: {
    language: "en",
    task: "transcribe",
    timestamps: true,
    word_timestamps: true,
    gen_file_txt: false,
    gen_file_subtitle: false,
    gen_file_vtt: false
  }
};

// Utility function to format time for transcript
function formatTime(time) {
  try {
    let hours = Math.floor(time / 3600);
    let minutes = Math.floor((time - hours * 3600) / 60);
    let seconds = time - hours * 3600 - minutes * 60;

    hours = String(hours).padStart(2, "0");
    minutes = String(minutes).padStart(2, "0");
    seconds = String(Math.round(seconds)).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Error in formatTime: ", error);
    throw error;
  }
}

// Utility function to create transcript from whisper output
function createTranscript(jsonData, subfolder) {
  try {
    let items = jsonData;
    let transcript = "";
    let currentText = "";
    let lineStartTime = Math.floor(
      items[0].start
        .split(":")
        .reduce((acc, time) => 60 * acc + +time.split(".")[0])
    );
    let lastValidTime = lineStartTime;

    items.forEach((item) => {
      let content = item.speech.trim();
      let startTime = Math.floor(
        item.start
          .split(":")
          .reduce((acc, time) => 60 * acc + +time.split(".")[0])
      );

      // If the start time is more than 10 minutes ahead, adjust it to be within 10 minutes of the last valid time
      if (startTime - lastValidTime > 10) {
        startTime = lastValidTime + 10;
      }

      lastValidTime = startTime;

      while (startTime - lineStartTime >= 5) {
        if (currentText.trim()) {
          transcript += `(${formatTime(
            lineStartTime
          )}) ${currentText.trim()}\n`;
          currentText = "";
        }
        lineStartTime += 5;
      }

      if (
        currentText.endsWith(" ") ||
        ",.;!?-()[]{}<>:\"'".includes(content.charAt(0))
      ) {
        currentText += content;
      } else {
        currentText += ` ${content}`;
      }
    });

    if (currentText.trim()) {
      transcript += `(${formatTime(lineStartTime)}) ${currentText.trim()}`;
    }

    const transcriptPath = path.resolve(
      __dirname,
      "../docs",
      subfolder,
      "transcript.txt"
    );
    fs.writeFileSync(transcriptPath, transcript);

    const transcriptJSONPath = path.resolve(
      __dirname,
      "../docs",
      subfolder,
      "transcript.json"
    );
    fs.writeFileSync(transcriptJSONPath, JSON.stringify(jsonData));

    return transcript;
  } catch (error) {
    console.error("Error in createTranscript: ", error);
    throw error;
  }
}

// Utility function to process a batch of screenshots in parallel
async function processBatch(videoPath, dirPath, times, maxParallel) {
    const results = [];
    for (let i = 0; i < times.length; i += maxParallel) {
        const batch = times.slice(i, i + maxParallel);
        const batchPromises = batch.map(time => 
            new Promise((resolve) => {
                const outputPath = path.resolve(dirPath, `${time}.jpg`);
                const process = ffmpeg()
                    .input(videoPath)
                    .inputOptions("-ss", time.toString())
                    .outputOptions("-vframes", "1")
                    .outputOptions("-f", "image2")
                    .output(outputPath);

                const timeout = setTimeout(() => {
                    process.kill();
                    console.error(`Screenshot at ${time} seconds timed out`);
                    resolve(false);
                }, 10000);

                process
                    .on("end", () => {
                        clearTimeout(timeout);
                        console.log(`Screenshot created at ${time} seconds`);
                        resolve(true);
                    })
                    .on("error", (err) => {
                        clearTimeout(timeout);
                        console.error(`Error at ${time} seconds:`, err);
                        resolve(false);
                    })
                    .run();
            })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to allow for cleanup
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    return results.filter(Boolean).length;
}

// Main route handler
router.post('/', async (req, res) => {
    try {
        // Step 1: Upload video file (handled by multer middleware)
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Get file details
        const subfolder = req.file.subfolder;
        const filename = req.file.filename;
        const videoPath = path.resolve(__dirname, "../docs", subfolder, "video", filename);

        // Send initial response to client
        res.status(202).json({
            message: 'Video processing started',
            subfolder: subfolder,
            filename: filename,
            status: 'processing'
        });

        // Step 2: Extract audio from video
        console.log("Extracting audio...");
        const audioDir = path.resolve(__dirname, "../docs", subfolder, "audio");
        fs.mkdirSync(audioDir, { recursive: true });
        const audioFilename = filename.split('.')[0] + '.wav';
        const audioOutput = path.resolve(audioDir, audioFilename);

        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .audioFrequency(16000)
                .audioChannels(1)
                .output(audioOutput)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
        console.log("Audio extraction complete");

        // Step 3: Generate screenshots
        console.log("Generating screenshots...");
        const imagesDir = path.resolve(__dirname, "../docs", subfolder, "images");
        fs.mkdirSync(imagesDir, { recursive: true });

        // First pass: Get scene changes
        const sceneChanges = [];
        const MIN_SCENE_CHANGE = 0.15;
        const MIN_TIME_GAP = 10;

        await new Promise((resolve, reject) => {
            let lastTime = 0;
            ffmpeg()
                .input(videoPath)
                .outputOptions("-vf", `select='gt(scene,${MIN_SCENE_CHANGE})',showinfo`)
                .outputOptions("-vsync", "0")
                .outputOptions("-an")
                .outputOptions("-f", "null")
                .output("pipe:1")
                .on("stderr", (stderrLine) => {
                    const match = stderrLine.match(/pts_time:(\d+\.\d+)/);
                    if (match) {
                        const currentTime = Math.round(parseFloat(match[1]));
                        if (currentTime - lastTime >= MIN_TIME_GAP) {
                            lastTime = currentTime;
                            sceneChanges.push(currentTime);
                        }
                    }
                })
                .on("end", resolve)
                .on("error", reject)
                .run();
        });

        // Limit the number of screenshots
        const MAX_SCREENSHOTS = 50;
        const selectedTimes = sceneChanges.slice(0, MAX_SCREENSHOTS);

        // Calculate optimal number of parallel processes
        const maxParallel = 3; // Simplified for this implementation
        
        // Process screenshots in controlled parallel batches
        await processBatch(videoPath, imagesDir, selectedTimes, maxParallel);
        console.log("Screenshots generation complete");

        // Step 4: Generate transcript
        console.log("Generating transcript...");
        const transcript = await whisper(audioOutput, options);
        const txtTranscript = createTranscript(transcript, subfolder);
        console.log("Transcript generation complete");

        // Step 5: Generate notes
        console.log("Generating notes...");
        const notesPath = await createTranscriptDocumentFromJson(
            subfolder,
            txtTranscript,
            "local", // source type
            "" // no youtube ID for local videos
        );
        console.log("Notes generation complete");

        // Return success with download path
        console.log("All processing complete!");
        return {
            success: true,
            message: 'Video processing complete',
            subfolder: subfolder,
            downloadUrl: `/v1/videos/download/${subfolder}`
        };
    } catch (error) {
        console.error("Error processing video:", error);
        return {
            success: false,
            error: "Error processing video",
            details: error.message
        };
    }
});

module.exports = router;
