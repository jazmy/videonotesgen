// Prompt: I want to add a new section in my code for devchecklistRefineGoal, please add all the placeholder code so I can go in and edit it.
const { refineTranscript } = require("./transcriptProcessing"); // Importing function to refine transcript from transcriptProcessing
const fs = require("fs"); // Importing Node.js file system module for handling file operations
const path = require("path"); // Importing Node.js path module for handling and transforming file paths
const archiver = require('archiver'); // For creating zip files
const {
  zipDirectory,
  convertMarkdownToRtf,
  convertMarkdownToHTML,
} = require("./documentHelpers");
const {
  mainGoal,
  summaryGoal,
  glossaryGoal,
  faqGoal,
  tldrGoal,
  slidesGoal,
} = require("./documentPrompts");
const {
  createOutlineSection,
  createSummarySection,
  createGlossarySection,
  createFaqSection,
  createTldrSection,
  createSlidesSection,
} = require("./documentSections");

// Function to create a transcript document from JSON
// Takes video ID and raw transcript as arguments
async function createTranscriptDocumentFromJson(
  videoId,
  rawTranscript,
  source,
  youtubeId
) {
  try {
  // Refine the transcript using the main goal
  const polishedTranscript = await refineTranscript(
    videoId,
    "mainGoal.json",
    rawTranscript,
    mainGoal,
    "gpt-4o-mini",
    6000
  );

  // Check if polishedTranscript is not null, not empty and is a valid JSON
  if (
    !polishedTranscript ||
    typeof polishedTranscript !== "object" ||
    Object.keys(polishedTranscript).length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return; // Return without proceeding further
  }

  const parsedPolishedTranscript = polishedTranscript; // Parse the polished transcript

  // Get the list of screenshot files from S3
  const imagesDir = path.join(__dirname, "../docs", videoId, "images");
  const screenshotFiles = fs
    .readdirSync(imagesDir)
    .filter((file) => /^\d/.test(file));
  // Create a set of screenshot timestamps by mapping the screenshot files to their timestamps
  const screenshotTimestamps = new Set(
    screenshotFiles
      .map((file) => {
        const match = file.match(/(\d+)\.jpg$/); // Match the timestamp in the file name
        return match ? parseInt(match[1], 10) : null; // Return the timestamp if it exists, otherwise return null
      })
      .filter((timestamp) => timestamp !== null) // Filter out null timestamps
  );

  // Create an outline section of the transcript
  const outlineSection = await createOutlineSection(
    parsedPolishedTranscript,
    screenshotTimestamps,
    videoId,
    source,
    youtubeId
  );

  //-------------
  // Summary Section
  //-------------

  // Refine the transcript using the summary goal
  const summaryTranscript = await refineTranscript(
    videoId,
    "summaryGoal.json",
    outlineSection,
    summaryGoal,
    "gpt-4o-mini",
    4000,
    0.6
  );

  if (
    !summaryTranscript ||
    typeof summaryTranscript !== "object" ||
    Object.keys(summaryTranscript).length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return; // Return without proceeding further
  }

  const parsedSummaryTranscript = summaryTranscript;

  const summarySection = await createSummarySection(parsedSummaryTranscript);
  console.log("summarySection done");

  // Refine the transcript using the glossary goal
  const glossaryTranscript = await refineTranscript(
    videoId,
    "glossaryGoal.json",
    outlineSection,
    glossaryGoal,
    "gpt-4o-mini",
    8000,
    0.6
  );
  // Refine the transcript using the FAQ goal
  const faqTranscript = await refineTranscript(
    videoId,
    "faqGoal.json",
    outlineSection,
    faqGoal,
    "gpt-4o-mini",
    8000,
    0.6
  );
  // Refine the transcript using the TL;DR goal
  const tldrTranscript = await refineTranscript(
    videoId,
    "tldrGoal.json",
    outlineSection,
    tldrGoal,
    "gpt-4o-mini",
    8000,
    0.6
  );

  // Refine the transcript using the slides goal
  const slidesTranscript = await refineTranscript(
    videoId,
    "slidesGoal.json",
    outlineSection,
    slidesGoal,
    "gpt-4o-mini",
    3000,
    0.6
  );



  // Check if refined transcripts are not null, not empty and are valid JSON
  if (
    !summaryTranscript ||
    typeof summaryTranscript !== "object" ||
    Object.keys(summaryTranscript).length === 0 ||
    !glossaryTranscript ||
    typeof glossaryTranscript !== "object" ||
    Object.keys(glossaryTranscript).length === 0 ||
    !faqTranscript ||
    typeof faqTranscript !== "object" ||
    Object.keys(faqTranscript).length === 0 ||
    !tldrTranscript ||
    typeof tldrTranscript !== "object" ||
    Object.keys(tldrTranscript).length === 0
  ) {
    console.error("Invalid of empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return; // Return without proceeding further
  }

  // Parse the refined transcripts

  const parsedGlossaryTranscript = glossaryTranscript;
  const parsedFaqTranscript = faqTranscript;
  const parsedTldrTranscript = tldrTranscript;
  const parsedSlidesTranscript = slidesTranscript;

  console.log("made it here");
  // Create sections of the transcript

  const glossarySection = await createGlossarySection(parsedGlossaryTranscript);
  console.log("glossarySection done");
  const faqSection = await createFaqSection(parsedFaqTranscript);
  console.log("faqSection done");
  const tldrSection = await createTldrSection(parsedTldrTranscript);
  console.log("tldrSection done");
  //const slidesSection = await createSlidesSection(parsedSlidesTranscript);
  //console.log("slideSection done");

  // Combine the sections into a single document
  const document = [
      tldrSection,
      outlineSection,
      summarySection,
      glossarySection,
      faqSection,
    //  slidesSection
    ].join('\n');

    // Create directories
    const dirs = {
      video: path.join(__dirname, "../docs", videoId),
      markdown: path.join(__dirname, "../docs", videoId, "markdown"),
      rtf: path.join(__dirname, "../docs", videoId, "rtf"),
      html: path.join(__dirname, "../docs", videoId, "html"),
      zip: path.join(__dirname, "../docs", videoId, "zip")
    };

    // Create all directories
    for (const dir of Object.values(dirs)) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Write files
    const markdownFilename = path.join(dirs.markdown, "transcript.md");
    fs.writeFileSync(markdownFilename, document);

    // Convert markdown to RTF
    try {
      await convertMarkdownToRtf(markdownFilename);
      // Move RTF file to correct directory
      const tempRtfPath = path.join(dirs.markdown, "transcript.rtf");
      const finalRtfPath = path.join(dirs.rtf, "transcript.rtf");
      if (fs.existsSync(tempRtfPath)) {
        fs.renameSync(tempRtfPath, finalRtfPath);
      }
    } catch (error) {
      console.error('Error converting to RTF:', error);
    }

    // Convert markdown to HTML
    try {
      await convertMarkdownToHTML(markdownFilename);
      // Move HTML file to correct directory
      const tempHtmlPath = path.join(dirs.markdown, "transcript.html");
      const finalHtmlPath = path.join(dirs.html, "transcript.html");
      if (fs.existsSync(tempHtmlPath)) {
        fs.renameSync(tempHtmlPath, finalHtmlPath);
      }
    } catch (error) {
      console.error('Error converting to HTML:', error);
    }

    // Create ZIP file
    try {
      // Ensure all directories exist
      for (const dir of Object.values(dirs)) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // Wait a moment for file system operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create zip file with only necessary files
      const zipFilename = path.join(dirs.zip, "transcript.zip");
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = fs.createWriteStream(zipFilename);

      return new Promise((resolve, reject) => {
        stream.on('close', () => {
          console.log('Zip file created successfully');
          resolve();
        });

        archive.on('error', (err) => {
          console.error('Error creating zip:', err);
          reject(err);
        });

        archive.pipe(stream);

        // Add markdown files
        archive.directory(dirs.markdown, 'markdown');

        // Add RTF files
        archive.directory(dirs.rtf, 'rtf');

        // Add HTML files
        archive.directory(dirs.html, 'html');

        // Add images
        const imagesDir = path.join(dirs.video, 'images');
        if (fs.existsSync(imagesDir)) {
          archive.directory(imagesDir, 'images');
        }

        // Add transcript.txt file
        const transcriptTxtPath = path.join(dirs.video, 'transcript.txt');
        if (fs.existsSync(transcriptTxtPath)) {
          archive.file(transcriptTxtPath, { name: 'transcript.txt' });
        }

        // Add raw transcript JSON file
        const transcriptJsonPath = path.join(dirs.video, 'transcript.json');
        if (fs.existsSync(transcriptJsonPath)) {
          archive.file(transcriptJsonPath, { name: 'transcript.json' });
        }

        archive.finalize();
      });

      // Verify zip file was created
      if (!fs.existsSync(zipFilename)) {
        throw new Error('Zip file was not created successfully');
      }
    } catch (error) {
      console.error('Error creating zip file:', error);
      throw error;
    }

    return path.join("docs", videoId, "zip", "transcript.zip");
  } catch (error) {
    console.error(`Error processing videoId: ${videoId}. Error: ${error.message}`);
    throw error;
  }
}

// Export the functions
module.exports = {
  createTranscriptDocumentFromJson
};
