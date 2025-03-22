const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
// Importing function to create a transcript document from JSON
const {
  createTranscriptDocumentFromJson,
} = require("../utils/documentProcessing");

// Setting up a POST route
router.post("/", async (req, res) => {
  try {
    console.log("req.body: ", req.body);
    // Extracting videoId from the request body
    const notes = req.body.notes;
    const notestitle = req.body.title;

    const sanitizedBaseName = notestitle.replace(/[^0-9a-zA-Z._-]+/g, "");
    // add a timestamp to the filename to make it unique
    const timestamp = new Date().getTime();
    const uniqueFilename = `${timestamp}-${sanitizedBaseName}`;

    // create foldr if it does not exist
    const NotesDirPath = path.resolve(__dirname, "../docs", sanitizedBaseName);
    if (!fs.existsSync(NotesDirPath)) {
      fs.mkdirSync(NotesDirPath, { recursive: true });
    }
    // create images folder if it does not exist
    const imagesDirPath = path.resolve(
      __dirname,
      "../docs",
      sanitizedBaseName,
      "images"
    );
    if (!fs.existsSync(imagesDirPath)) {
      fs.mkdirSync(imagesDirPath, { recursive: true });
    }

    const NotesFilePath = path.join(NotesDirPath, "notes.txt");
    //first line of the file should be the url
    fs.writeFileSync(NotesFilePath, notestitle + "\n");
    fs.appendFileSync(NotesFilePath, notes);

    console.log("Processing notes:", notes);
    // Generating raw transcript for the video

    // Checking if rawTranscript is undefined
    if (!notes) {
      console.error("Error: notes is undefined:", notes);
      // Sending error response
      res.status(400).json({ error: "Notes is undefined." });
      return;
    }

    // Creating a transcript document from the raw transcript JSON
    const filename = await createTranscriptDocumentFromJson(
      sanitizedBaseName,
      notes,
      'text',  // source
      '',      // no youtubeId for text notes
      req.body.format || 'text'  // format (text or slides)
    );
    console.log("Created: ", sanitizedBaseName);

    // Sending success response with filename
    res.status(200).json({
      success: true,
      message: 'Notes generated successfully',
      filename: sanitizedBaseName
    });
  } catch (error) {
    // Logging any errors that occur during processing
    console.error(`Error occurred while processing -  Error: ${error.message}`);
    // Sending error response
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

// Exporting the router
module.exports = router;
