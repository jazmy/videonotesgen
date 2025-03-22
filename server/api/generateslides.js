const express = require("express");
const router = express.Router();
const PptxGenJS = require("pptxgenjs"); // Importing PptxGenJS for PowerPoint generation
const fs = require("fs"); // File system module for file operations
const path = require("path"); // Path module for handling and transforming file paths
const { generateImage } = require("../utils/documentHelpers"); // Importing function to generate image

let videoId;
// Route to generate PowerPoint
router.post("/", async (req, res) => {
  videoId = req.body.videoId;
  videoId = videoId.replace(/[^0-9a-zA-Z._-]+/g, "");
  const pptx = new PptxGenJS(); // Creating a new PowerPoint

  // Define a slide master with a background color and default text styles
  pptx.layout = "LAYOUT_WIDE"; // Setting layout
  pptx.defineSlideMaster({
    // Defining slide master
    title: "MASTER_SLIDE",
    background: { color: "000000" },
    objects: [
      // Defining placeholders for title, body, timestamp and visual
      // Each placeholder has its own options like name, type, position, font, color, alignment, etc.
      // These options will be used while adding text to these placeholders
      // Placeholder for title
      {
        placeholder: {
          options: {
            name: "title",
            type: "title",
            x: 0.5,
            y: 0.5,
            w: 12.5,
            h: 1,
            fontFace: "Nunito Sans",
            fontSize: 32,
            color: "FFFFFF",
            align: "left",
            bold: true,
          },
        },
      },
      // Placeholder for body
      {
        placeholder: {
          options: {
            name: "body",
            type: "body",
            x: 0.5,
            y: 2,
            w: 7,
            h: 4.5,
            fontFace: "Calibri Light (Headings)",
            fontSize: 28,
            color: "FFFFFF",
            align: "left",
          },
        },
      },
      // Placeholder for timestamp
      {
        placeholder: {
          options: {
            name: "timestamp",
            type: "body",
            x: 0.5,
            y: 6.5,
            w: 3,
            h: 1.0,
            fontFace: "Calibri Light (Headings)",
            fontSize: 18,
            color: "FFFFFF",
            align: "left",
            italic: true,
          },
        },
      },
      // Placeholder for visual
      {
        placeholder: {
          options: {
            name: "visual",
            type: "body",
            x: 8,
            y: 6.5,
            w: 5,
            h: 1.0,
            fontFace: "Nunito Sans",
            fontSize: 12,
            color: "EAEAEA",
            align: "left",
            italic: true,
          },
        },
      },
    ],
  });

  const videoDir = path.resolve(__dirname, "../docs", videoId); // Directory for video
  const filePath = path.join(videoDir, `presentation.pptx`); // Path for PowerPoint file

  const parsedJsonSlidesFeed = JSON.parse(
    fs.readFileSync(path.join(videoDir, "slidesGoal.json"))
  ); // Reading slides.json file

  // Looping through parsedJsonSlidesFeed to create slides
  for (let i = 0; i < parsedJsonSlidesFeed.length; i++) {
    const slidesEntry = parsedJsonSlidesFeed[i]; // Current slide entry
    const imagePath = path.join(videoDir, "images", `slide-${i}.png`); // Path for image

    // If image does not exist, generate it
    if (!fs.existsSync(imagePath)) {
      const imagePrompt = `Can you create an image for a powerpoint slide that includes: ${slidesEntry.Visual} 
      
      - it should contain no text, have a black background, vibrant color gradients, a modern and clean design.

      - Color Gradients: Image uses a bright and attractive gradient scheme that smoothly transitions between colors, giving a dynamic and contemporary feel to the design. Smooth transitions between colors in a gradient could range from warm colors like reds, oranges, and yellows to cool colors like blues, greens, and purples.

      `;
      await generateImage(videoId, imagePrompt, `slide-${i}.png`); // Generating image
    }

    // Add a slide using the master layout
    let slide = pptx.addSlide({ masterName: "MASTER_SLIDE" }); // Adding slide
    // Adding text to placeholders
    slide.addText(slidesEntry.Title.toUpperCase(), { placeholder: "title" });
    slide.addText(slidesEntry.Content, { placeholder: "body" });
    slide.addText(`Timestamp: ${slidesEntry.Timestamp}`, {
      placeholder: "timestamp",
    });
    slide.addText(slidesEntry.Visual, { placeholder: "visual" });

    // If image exists, add it to the slide
    if (fs.existsSync(imagePath)) {
      // Add the image to the slide
      slide.addImage({
        path: imagePath,
        x: 8,
        y: 2,
        w: 4.5,
        h: 4.5,
        sizing: {
          type: "contain",
        },
      });
    } else {
      console.warn(`Image file does not exist: ${imagePath}`); // Logging warning if image does not exist
    }

    // Add the speaker notes to the slide
    slide.addNotes(slidesEntry.Explanation); // Adding speaker notes
  }

  // Streaming the PowerPoint
  pptx
    .stream({ compression: false })
    .then((data) => {
      // Write the data to a file on the server
      if (data instanceof Uint8Array) {
        fs.writeFileSync(filePath, data); // Writing data to file
        console.log("Powerpoint created successfully!"); // Logging success message
        res.status(200).send({ filename: videoId }); // Sending success response
      } else {
        console.error("Unexpected data type"); // Logging error if data type is unexpected
        res.status(500).send({ error: "Unexpected data type" }); // Sending error response
      }
    })
    .catch((error) => {
      console.error("Failed to create the file!", error); // Logging error if file creation fails
      res.status(500).send({ error: "Failed to create the file!" }); // Sending error response
    });
});

module.exports = router; // Exporting router
