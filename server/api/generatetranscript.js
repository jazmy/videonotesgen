const express = require("express");
const router = express.Router();
const whisper = require("whisper-node").default;

const fs = require("fs");
const path = require("path");

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

    items.forEach((item, index) => {
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



router.post("/", async function (req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const subfolder = req.body.subfolder;
    const filename = req.body.filename;
    
    if (!subfolder || !filename) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required parameters: subfolder and filename" 
      });
    }

    const audioPath = path.resolve(__dirname, "../docs", subfolder, "audio", filename);
    
    // Check if audio file exists
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Audio file not found: ${filename}` 
      });
    }

    console.log(`Processing audio file: ${audioPath}`);
    const transcript = await whisper(audioPath, options);

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      throw new Error('No transcript data generated');
    }

    const txttranscript = await createTranscript(transcript, subfolder);
    console.log('Transcript generated successfully');

    res.status(200).json({ 
      success: true, 
      transcript: txttranscript 
    });
  } catch (error) {
    console.error("Error in POST route: ", error);
    res.status(500).json({
      success: false,
      error: "Error generating transcript",
      details: error.message,
    });
  }
});

module.exports = router;
