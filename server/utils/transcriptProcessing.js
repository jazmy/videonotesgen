const OpenAI = require("openai"); // Importing OpenAI SDK
console.log("OpenAI SDK imported"); // Debugging line
const fs = require("fs"); // Importing Node.js file system module for handling file operations
console.log("Node.js file system module imported"); // Debugging line
const path = require("path"); // Importing Node.js path module for handling and transforming file paths
console.log("Node.js path module imported"); // Debugging line
const marked = require("marked"); // Importing marked for parsing markdown
const config = require("../config"); // Importing configuration

// Initialize OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);
console.log("OpenAI client initialized"); // Debugging line

// Function to chunk the transcript
async function chunkTranscript(transcript, charsPerChunk) {
  console.log("chunkTranscript function called"); // Debugging line
  console.log("Chars per chunk:", charsPerChunk); // Debugging line
  console.log("Total length of transcript:", transcript.length); // Debugging line
  try {
    let chunks = []; // Initialize chunks as an empty array
    // Loop through the transcript
    for (let i = 0; i < transcript.length; i += charsPerChunk) {
      // Add a chunk of characters to chunks.
      // Multiplying by 3 because 3 chartcter ~1 token
      chunks.push(transcript.slice(i, i + charsPerChunk * 3));
      console.log(
        "Total length of chunk:",
        transcript.slice(i, i + charsPerChunk * 3).length
      ); // Debugging line
    }
    console.log("Chunks created"); // Debugging line

    return chunks; // Return the chunks
  } catch (error) {
    // Catch any errors
    console.error("Error in chunkTranscript:", error); // Debugging line
    throw error; // Throw the error
  }
}

// Function to generate a transcript from a video
// Takes video ID as an argument
async function generateTranscript(videoId) {
  console.log(`Generating transcript for video: ${videoId}`); // Debugging line
  const videoDir = path.resolve(__dirname, "../docs", videoId); // Defining the directory path for the video
  console.log(`Video directory path defined: ${videoDir}`); // Debugging line
  const transcriptFilePath = path.join(videoDir, "transcript.txt"); // Defining the file path for the transcript
  console.log(`Transcript file path defined: ${transcriptFilePath}`); // Debugging line

  // Checking if the transcript file already exists
  if (fs.existsSync(transcriptFilePath)) {
    console.log("Transcript file already exists"); // Debugging line
    const existingTranscript = fs.readFileSync(transcriptFilePath, "utf8"); // Reading the existing transcript file
    console.log("Existing transcript file read"); // Debugging line
    return existingTranscript;
  }

  try {
    // Check if the JSON transcript file exists locally
    const jsonTranscriptPath = path.join(videoDir, "transcript.json");
    if (fs.existsSync(jsonTranscriptPath)) {
      console.log("JSON transcript file exists locally"); // Debugging line
      const transcriptData = fs.readFileSync(jsonTranscriptPath, "utf8");
      const transcriptJson = JSON.parse(transcriptData);
      
      // Process the transcript data
      let transcript = "";
      if (transcriptJson.results && transcriptJson.results.items) {
        const items = transcriptJson.results.items;
        console.log("Items extracted from JSON"); // Debugging line
        
        let currentTime = 0;
        let currentText = "";
        
        // Looping through each item in the items array
        for (const item of items) {
          // Checking if the item type is pronunciation or punctuation
          if (item.type === "pronunciation" || item.type === "punctuation") {
            let content = item.alternatives[0].content; // Extracting the content from the item
            console.log(`Content extracted from item: ${content}`); // Debugging line
            let startTime = parseFloat(item.start_time || currentTime.toString()); // Extracting the start time from the item or using the current time
            console.log(`Start time extracted from item: ${startTime}`); // Debugging line

            // Checking if the difference between the start time and current time is greater than or equal to 25
            if (startTime - currentTime >= 25) {
              // Adding the current text to the transcript with the current time
              transcript += `(${convertSecondsToTimeFormat(
                currentTime
              )}) ${currentText.trim()}\n`;
              console.log("Current text added to transcript"); // Debugging line
              currentTime = startTime; // Updating the current time to the start time
              console.log(`Current time updated to: ${currentTime}`); // Debugging line
              currentText = ""; // Resetting the current text to an empty string
              console.log("Current text reset to an empty string"); // Debugging line
            }

            // Adding the content to the current text
            currentText += item.type === "punctuation" ? content : ` ${content}`;
            console.log(`Content added to current text: ${currentText}`); // Debugging line
          }
        }

        // Checking if the current text is not an empty string
        if (currentText.trim()) {
          // Adding the current text to the transcript with the current time
          transcript += `(${convertSecondsToTimeFormat(
            currentTime
          )}) ${currentText.trim()}\n`;
          console.log("Current text added to transcript"); // Debugging line
        }
        console.log("transcript length:", transcript.length); // Debugging line
      } else {
        console.log("No items found in JSON transcript"); // Debugging line
        return "No transcript data available";
      }

      fs.mkdirSync(videoDir, { recursive: true }); // Creating the video directory if it doesn't exist
      console.log("Video directory created"); // Debugging line
      fs.writeFileSync(transcriptFilePath, transcript); // Writing the transcript to the transcript file
      console.log("Transcript written to transcript file"); // Debugging line

      return transcript; // Returning the transcript
    } else {
      console.log("JSON transcript file does not exist locally"); // Debugging line
      return "Transcript file not found. Please generate a transcript first.";
    }
  } catch (error) {
    console.error("Error creating transcript document:", error); // Logging the error
    return `Error generating transcript: ${error.message}`;
  }
}

// Function to check if content is in markdown format
function isMarkdown(content) {
  try {
    marked(content);
    return true;
  } catch (error) {
    return false;
  }
}

async function refineTranscript(
  videoId,
  filename,
  content,
  mainGoal,
  model,
  tokenChunkSize,
  temperature
) {
  tokenChunkSize = tokenChunkSize * 3; // 3 characters ~ 1 token
  console.log(`Refining content for video: ${videoId}`);
  const videoDir = path.resolve(__dirname, "../docs", videoId);
  const jsonFilePath = path.join(videoDir, `${filename}`);

  if (fs.existsSync(jsonFilePath)) {
    const fileContent = fs.readFileSync(jsonFilePath, "utf8");
    const jsonData = JSON.parse(fileContent);
    if (Array.isArray(jsonData) && jsonData.length > 0) {
      console.log("JSON file " + filename + " already exists and is not empty");
      return jsonData;
    }
  }
  let chunks = [];
  // In your refineTranscript function
  if (isMarkdown(content)) {
    // Split the content by level 1 headings
    let splitContent = content.split(/\n(?=# )/);

    // Loop through the split content
    for (const section of splitContent) {
      // Trim the section and add it to the chunks
      chunks.push(section.trim());
    }

    // Chunk the chunks that are over the tokenChunkSize by level 2 headings
    chunks = chunks.flatMap((chunk) => {
      if (chunk.length > tokenChunkSize) {
        // If chunk is larger than tokenChunkSize, split it by level 2 headings
        let splitChunk = chunk.split(/\n(?=### )/);
        let chunked = [];
        let currentChunk = "";
        for (let section of splitChunk) {
          section = section.trim();
          if (currentChunk.length + section.length > tokenChunkSize) {
            chunked.push(currentChunk);
            currentChunk = section;
          } else {
            currentChunk += "\n" + section;
          }
        }
        if (currentChunk) {
          chunked.push(currentChunk);
        }
        return chunked;
      } else {
        // If chunk is not larger than tokenChunkSize, return it as is
        return chunk;
      }
    });
  } else {
    // Chunk by characters based on the tokenChunkSize
    for (let i = 0; i < content.length; i += tokenChunkSize) {
      chunks.push(content.slice(i, i + tokenChunkSize));
    }
  }

  let combinedJsonFeed = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(
      filename + " - Processing chunk: " + (i + 1) + " of " + chunks.length
    );
    console.log("Chunk content: " + chunks[i]);
    let chunkResponse;
    try {
      chunkResponse = await processTranscriptChunk(
        chunks[i],
        mainGoal,
        model,
        temperature
      );
    } catch (error) {
      console.error(`Error processing chunk: ${error}`);
      chunkResponse = {}; // default value in case of error
    }

    if (chunkResponse === undefined) {
      chunkResponse = {};
    }

    if (isJsonValid(chunkResponse)) {
      combinedJsonFeed = combinedJsonFeed.concat(chunkResponse);
    }
  }

  fs.mkdirSync(videoDir, { recursive: true });
  fs.writeFileSync(jsonFilePath, JSON.stringify(combinedJsonFeed));

  return combinedJsonFeed;
}

// Function to process a transcript chunk
// Takes chunk, main goal, and model as arguments
// Function to process a transcript chunk
// Takes chunk, main goal, and model as arguments
async function processTranscriptChunk(chunk, mainGoal, model, temperature) {
  // console.log(`Processing transcript chunk: ${chunk}`); // Debugging line
  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant designed to output JSON.",
    },
    {
      role: "user",
      content: `${mainGoal}\n\nHere is the content:\n${chunk}.`,
    },
  ];
  console.log("Messages created"); // Debugging line

  let retries = 3;
  while (retries > 0) {
    try {
      // if temperature is not provided, use default value of 0.6
      if (!temperature) {
        temperature = 0.6;
      }
      
      // Create the chat completion with OpenAI
      // Wrap your API call with a Promise.race to implement a timeout
      const response = await Promise.race([
        openai.chat.completions.create({
          model: model || config.aiSettings.model,
          messages: messages,
          temperature: temperature,
        }),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Timeout")), 120000) // 120 seconds timeout
        ),
      ]);

      console.log("Response received from Copilot client"); // Debugging line

      if (!response || !response.choices) {
        console.error("Invalid response structure."); // Logging the error
        return [];
      }

      const reply = response.choices[0]?.message?.content;
      if (!reply) {
        console.error("Reply content not found."); // Logging the error
        return [];
      }
      console.log("Reply content found"); // Debugging line
      return JSON.parse(reply);
    } catch (error) {
      if (error.message === "Timeout") {
        retries--;
        console.log(`Timeout error occurred. Retries left: ${retries}`); // Logging the error
        console.log("I will wait " + 10000 * (4 - retries) + " seconds"), // Debugging line
          await new Promise((r) => setTimeout(r, 10000 * (4 - retries)));
      } else {
        console.error("Error processing chunk:", error); // Logging the error
        return [];
      }
    }
  }
}

// Function to check if an object is valid JSON
// Takes an object as an argument
function isJsonValid(obj) {
  // Check if the object is null or empty
  if (obj === null || Object.keys(obj).length === 0) {
    console.log("Object is null or empty"); // Debugging line
    return false; // Returning false if the object is null or empty
  }
  try {
    JSON.stringify(obj); // Trying to stringify the object
    console.log("Object is valid JSON"); // Debugging line
    return true; // Returning true if the object is valid JSON
  } catch (e) {
    console.log("Object is not valid JSON"); // Debugging line
    return false; // Returning false if the object is not valid JSON
  }
}

// Function to convert seconds to time format
// Takes seconds as an argument
function convertSecondsToTimeFormat(seconds) {
  const date = new Date(0); // Creating a new date object
  console.log("New date object created"); // Debugging line
  date.setSeconds(seconds); // Setting the seconds of the date object
  console.log(`Seconds of date object set to: ${seconds}`); // Debugging line
  return date.toISOString().substr(11, 8); // Returning the time part of the date object
}

// Exporting the functions
module.exports = {
  generateTranscript,
  refineTranscript,
  processTranscriptChunk,
  isJsonValid,
  convertSecondsToTimeFormat,
  chunkTranscript,
};
console.log("Functions exported"); // Debugging line
