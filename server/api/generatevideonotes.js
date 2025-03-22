const express = require("express");
const router = express.Router();
const readline = require("readline");
// Importing function to create a transcript document from JSON
const {
  createTranscriptDocumentFromJson,
} = require("../utils/documentProcessing");
const fs = require("fs");
const path = require("path");

function processLineByLine(transcriptFilePath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(transcriptFilePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const splitLine = line.split("v=");
      if (splitLine.length > 1) {
        const youtubeId = splitLine[1].split("&")[0];
        resolve(youtubeId);
      } else {
        resolve("");
      }
      rl.close();
    });

    rl.on("error", reject);
  });
}

// Setting up a POST route
router.post("/", async (req, res) => {
  let videoId;
  try {
    console.log("req.body: ", req.body);
    // Extracting videoId from the request body
    videoId = req.body.videoId;
    source = req.body.source;
    videoId = videoId.replace(/[^0-9a-zA-Z._-]+/g, "");
    console.log("Processing videoId:", videoId);
    // Generating raw transcript for the video

    // create foldr if it does not exist
    const transcriptDirPath = path.resolve(__dirname, "../docs", videoId);
    if (!fs.existsSync(transcriptDirPath)) {
      fs.mkdirSync(transcriptDirPath, { recursive: true });
    }
    // create images folder if it does not exist
    const imagesDirPath = path.resolve(__dirname, "../docs", videoId, "images");
    if (!fs.existsSync(imagesDirPath)) {
      fs.mkdirSync(imagesDirPath, { recursive: true });
    }

    let transcriptFilePath;
    let youtubeId = "";
    if (source === "youtube") {
      transcriptFilePath = path.resolve(
        __dirname,
        "../docs",
        videoId,
        "youtubeTranscript.txt"
      );
      // the youtube id needs to be parsed from the first line of the rawTranscript which contains the youtubeURL
      youtubeId = await processLineByLine(transcriptFilePath);
    } else {
      transcriptFilePath = path.resolve(
        __dirname,
        "../docs",
        videoId,
        "transcript.txt"
      );
    }
    const rawTranscript = fs.readFileSync(transcriptFilePath, "utf8");

    // Checking if rawTranscript is undefined
    if (!rawTranscript) {
      console.error("Error: rawTranscript is undefined for videoId:", videoId);
      // Sending error response
      res.status(400).json({ error: "Raw transcript is undefined." });
      return;
    }

    // Checking if rawTranscript is undefined
    if (!rawTranscript) {
      console.error("Error: rawTranscript is undefined for videoId:", videoId);
      // Sending error response
      res.status(400).json({ error: "Raw transcript is undefined." });
      return;
    }

    // Creating a transcript document from the raw transcript JSON
    const filename = await createTranscriptDocumentFromJson(
      videoId,
      rawTranscript,
      source,
      youtubeId
    );
    console.log("Created transcript document:", videoId);

    // Sending success response with filename
    res.status(200).json({ filename: `${videoId}` });
  } catch (error) {
    // Logging any errors that occur during processing
    console.error(
      `Error occurred while processing videoId: ${videoId}. Error: ${error.message}`
    );
    // Sending error response
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

// Exporting the router
module.exports = router;
