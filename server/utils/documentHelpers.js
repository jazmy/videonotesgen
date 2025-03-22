const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const MarkdownIt = require("markdown-it");
const shell = require("shelljs");
const sharp = require("sharp");
const OpenAI = require("openai"); // Importing OpenAI SDK
const { promisify } = require("util"); // Importing promisify from util for converting callback-based functions to promise-based
const { createWriteStream } = require("fs"); // Importing createWriteStream from fs for creating writable stream
const { pipeline } = require("stream");
const config = require("../config"); // Importing configuration

// Initialize OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);
console.log("OpenAI client initialized"); // Debugging line

// Function to convert a timestamp to seconds
// Takes a timestamp as an argument
function convertTimestampToSeconds(timestamp) {
  const cleanedTimestamp = timestamp.replace(/[()]/g, ""); // Remove parentheses from the timestamp
  const parts = cleanedTimestamp.split(":"); // Split the timestamp into parts

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  // Check the number of parts in the timestamp
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10); // Parse the hours from the timestamp
    minutes = parseInt(parts[1], 10); // Parse the minutes from the timestamp
    seconds = parseInt(parts[2], 10); // Parse the seconds from the timestamp
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10); // Parse the minutes from the timestamp
    seconds = parseInt(parts[1], 10); // Parse the seconds from the timestamp
  } else {
    throw new Error("Invalid timestamp format"); // Throw an error if the timestamp format is invalid
  }

  return hours * 3600 + minutes * 60 + seconds; // Return the timestamp in seconds
}

async function convertImageToHexAndCalculateDimensions(buffer) {
  let image = sharp(buffer);
  const metadata = await image.metadata();

  const scale = 0.35;
  const widthInTwips = metadata.width
    ? Math.round(metadata.width * 15 * scale)
    : 0;
  const heightInTwips = metadata.height
    ? Math.round(metadata.height * 15 * scale)
    : 0;

  // Convert image to JPEG
  const jpegBuffer = await image.jpeg().toBuffer();
  let hexString = "";
  for (const byte of Array.from(jpegBuffer)) {
    hexString += byte.toString(16).padStart(2, "0");
  }

  return { hexString, widthInTwips, heightInTwips };
}

async function zipDirectory(source, out) {
  if (!fs.existsSync(source)) {
    throw new Error(`Source directory does not exist: ${source}`);
  }

  // Ensure output directory exists
  const outDir = path.dirname(out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    // Listen for all archive data to be written
    stream.on('close', () => {
      console.log(`Zip file created successfully: ${out}`);
      resolve();
    });

    // Good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Warning while creating zip:', err);
      } else {
        reject(err);
      }
    });

    // Good practice to catch this error explicitly
    archive.on('error', (err) => {
      console.error('Error creating zip:', err);
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(stream);

    // Append files from source directory, putting its contents at the root of archive
    archive.directory(source, false);

    // Finalize the archive (ie we are done appending files but streams have to finish yet)
    archive.finalize();
  });
}

function convertContentToBullets(content) {
  const lines = Array.isArray(content)
    ? content
    : content.includes("\n")
    ? content.split("\n")
    : content.split(".");
  return lines
    .map((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("-")) {
        return `\\bullet  ${trimmedLine.substring(1).trim()}`;
      }
      return line;
    })
    .join("\\line ");
}

function convertContentToHTMLBullets(content) {
  const bulletPattern = /\\bullet\s*(.*?)(?=(\\bullet|$))/gs;
  return content.replace(
    bulletPattern,
    (_, group) => `<ul><li>${group.trim()}</li></ul>`
  );
}

async function convertMarkdownToRtf(filePath) {
  console.log('Converting markdown to RTF:', filePath);
  const markdown = fs.readFileSync(filePath, "utf-8");
  const lines = markdown.split("\n").map((line) => line.trimStart());

  let rtf = "{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Verdana;}}\n";

  for (let line of lines) {
    if (line.startsWith("# ")) {
      rtf += `{\\par\n\\par\n\\fs36 ${line.substring(2)}}\\par\n`;
    } else if (line.startsWith("## ")) {
      rtf += `{\\par\n\\par\n\\fs32 ${line.substring(3)}}\\par\n`;
    } else if (line.startsWith("### ")) {
      rtf += `{\\par\n\\par\n\\fs28 ${line.substring(4)}}\\par\n`;
    } else if (line.startsWith("#### ")) {
      rtf += `{\\par\n\\par\n\\fs24 ${line.substring(5)}}\\par\n`;
    } else if (line.startsWith("##### ")) {
      rtf += `{\\par\n\\par\n\\fs20 ${line.substring(6)}}\\par\n`;
    } else if (line.startsWith("###### ")) {
      rtf += `{\\par\n\\par\n\\fs16 ${line.substring(7)}}\\par\n`;
    } else if (line.startsWith("* ")) {
      rtf += `{\\par\n\\par\n\\f0\\'95 ${line.substring(2)}}\n`;
    } else if (line === "") {
      rtf += "\\par\n";
    } else if (line.startsWith("- ")) {
      // Convert markdown bullets to RTF bullets
      rtf += convertContentToBullets(line) + "\\par\n";
    } else {
      line = line.replace(/\*\*(.*?)\*\*/g, "{\\b $1}\\b0");
      line = line.replace(/__(.*?)__/g, "{\\b $1}\\b0");
      line = line.replace(/\*(.*?)\*/g, "{\\i $1}\\i0");
      line = line.replace(/_(.*?)_/g, "{\\i $1}\\i0");

      // Convert markdown images to RTF images
      //  const imageMatches = line.matchAll(/\!\[.*?\]\((.*?)\)/g);
      const imageMatches = line.matchAll(/\!\[.*?\]\((.*?\..*?)\)/g);
      for (const match of imageMatches) {
        const imagePath = path.join(path.dirname(filePath), match[1]);
        const buffer = fs.readFileSync(imagePath);
        const { hexString, widthInTwips, heightInTwips } =
          await convertImageToHexAndCalculateDimensions(buffer);
        const rtfImage = `\\par{\\pict\\jpegblip\\picw${widthInTwips}\\pich${heightInTwips}\\picwgoal${widthInTwips}\\pichgoal${heightInTwips} ${hexString}}\\par\n`;
        line = line.replace(match[0], rtfImage);
      }

      rtf += line + "\n";
    }
  }

  rtf += "}";

  const rtfFilePath = path.join(
    path.dirname(filePath),
    path.basename(filePath, ".md") + ".rtf"
  );
  fs.writeFileSync(rtfFilePath, rtf);

  console.log(`RTF file has been created at ${rtfFilePath}`);
}

async function convertMarkdownToHTML(filePath) {
  let markdown = fs.readFileSync(filePath, "utf-8");

  markdown = markdown.replace(
    /^>\s?(.*)$/gm,
    `DIVCALLOUTSTART $1 DIVCALLOUTEND`
  );

  // Now pass the modified markdown to MarkdownIt
  const md = new MarkdownIt();
  let html = md.render(markdown);

  // Replace \line with <br/>
  html = html.replace(/\\line/g, "<br>");
  //  html = convertContentToHTMLBullets(html);
  html = html.replace(/\\bullet/g, "<br> &nbsp &nbsp &nbsp - ");

  html = html.replace(
    /DIVCALLOUTSTART/g,
    '<div class="kg-card kg-callout-card kg-callout-card-yellow"><div class="kg-callout-text">'
  );
  html = html.replace(/DIVCALLOUTEND/g, "</div></div>");

  console.log("path.dirname(filePath): ", path.dirname(filePath));

  const htmlFilePath = path.join(
    path.dirname(filePath),
    path.basename(filePath, ".md") + ".html"
  );
  fs.writeFileSync(htmlFilePath, html);

  // No longer creating RTF file from HTML to avoid duplication
  console.log(`HTML file has been created at ${htmlFilePath}`);
}

// Function to download an image
// Takes image URL and output location path as arguments
async function downloadImage(imageUrl, outputLocationPath) {
  const asyncPipeline = promisify(pipeline); // Promisifying the pipeline function
  console.log("Pipeline function promisified"); // Debugging line
  const response = await fetch(imageUrl); // Fetching the image
  console.log("Image fetched"); // Debugging line
  if (!response.ok || !response.body) {
    throw new Error(`unexpected response ${response.statusText}`); // Throwing an error if the response is not OK or the body is not present
  }
  await asyncPipeline(response.body, createWriteStream(outputLocationPath)); // Writing the image to the output location
  console.log("Image written to output location"); // Debugging line
}

// Function to generate an image
// Takes video ID, prompt, and image filename as arguments
async function generateImage(videoId, prompt, imageFilename, width, height) {
  try {
    //if width and height are not provided, use default values of 1024x1024
    if (!width || !height) {
      width = 1024;
      height = 1024;
    }
    console.log(`Generating image for video: ${videoId}`); // Debugging line
    const videoDir = path.resolve(__dirname, "../docs", videoId, "images"); // Defining the directory path for the images
    console.log(`Images directory path defined: ${videoDir}`); // Debugging line
    fs.mkdirSync(videoDir, { recursive: true }); // Creating the images directory if it doesn't exist
    console.log("Images directory created"); // Debugging line

    // Create the image with OpenAI
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: `${width}x${height}`,
    });
    console.log("Response received from Copilot client image generation"); // Debugging line

    if (!response || !response.data || response.data.length === 0) {
      console.error("No image was created"); // Logging the error
      return;
    }
    console.log("response:", response); // Debugging line
    const image_url = response.data[0]?.url;
    if (!image_url) {
      console.error("Image URL is undefined"); // Logging the error
      return;
    }
    const outputLocationPath = path.join(videoDir, imageFilename); // Defining the output location path for the image
    console.log(
      `Output location path for image defined: ${outputLocationPath}`
    ); // Debugging line
    await downloadImage(image_url, outputLocationPath); // Downloading the image
    console.log("Image downloaded"); // Debugging line
  } catch (error) {
    console.error("Error generating image:", error); // Logging the error
  }
}

module.exports = {
  convertTimestampToSeconds,
  convertImageToHexAndCalculateDimensions,
  zipDirectory,
  convertContentToBullets,
  convertMarkdownToRtf,
  convertMarkdownToHTML,
  downloadImage,
  generateImage,
};
