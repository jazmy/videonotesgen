const express = require('express');
const router = express.Router();
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const os = require('os');
ffmpeg.setFfmpegPath(ffmpegPath);

const fs = require("fs");
const path = require("path");

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

router.post('/', async function(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed. Use POST." });
        }

        const subfolder = req.body.subfolder;
        const filename = req.body.filename;
        const videoPath = path.resolve(__dirname, "../docs", subfolder, "video", filename);

        // Verify video file exists before starting
        if (!fs.existsSync(videoPath)) {
            console.error("Video file not found:", videoPath);
            return res.status(404).json({ error: "Video file not found" });
        }

        // Get video file stats to ensure it's accessible
        const videoStats = fs.statSync(videoPath);
        if (!videoStats.isFile()) {
            console.error("Not a valid file:", videoPath);
            return res.status(400).json({ error: "Not a valid video file" });
        }

        console.log("Processing video:", videoPath, "Size:", videoStats.size);

        const dirPath = path.resolve(__dirname, "../docs", subfolder, "images");
        fs.mkdirSync(dirPath, { recursive: true });

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

        // Calculate optimal number of parallel processes based on system resources
        const cpuCount = os.cpus().length;
        const systemMemory = os.totalmem() / (1024 * 1024 * 1024); // Convert to GB
        
        // Heuristic for parallel processes:
        // - Maximum of 3 parallel processes
        // - At least 2GB of memory per process
        // - Leave 2 CPU cores free for system
        const maxParallel = Math.min(
            3, // Hard maximum
            Math.floor(cpuCount / 2), // Use half of CPU cores
            Math.floor(systemMemory / 2) // Allow 2GB per process
        );

        console.log(`Processing with ${maxParallel} parallel processes`);
        
        // Process screenshots in controlled parallel batches
        const screenshotCount = await processBatch(videoPath, dirPath, selectedTimes, maxParallel);

        const endTime = new Date();
        console.log('\n=================================');
        console.log('🎉 Screenshot Generation Complete!');
        console.log('---------------------------------');
        console.log(`✅ Total Screenshots: ${screenshotCount}`);
        console.log(`📁 Output Directory: ${dirPath}`);
        console.log(`⚡ Parallel Processes: ${maxParallel}`);
        console.log('=================================\n');

        res.status(200).json({
            message: "Screenshots captured successfully",
            screenshotCount: screenshotCount,
            outputDirectory: dirPath
        });
    } catch (error) {
        console.error('Screenshot generation error:', error);
        res.status(500).json({ error: "Failed to generate screenshots" });
    }
});

module.exports = router;
