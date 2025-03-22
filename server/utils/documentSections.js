const fs = require("fs");
const path = require("path");
const {
  convertTimestampToSeconds,
  convertContentToBullets,
  generateImage
} = require("./documentHelpers");

// Function to create an outline section of the transcript with screenshots
// Takes parsed JSON feed, screenshot timestamps, and video ID as arguments
async function createOutlineSection(
  parsedJsonFeed,
  screenshotTimestamps,
  videoId,
  source,
  youtubeid
) {
  try {
  let transcript = "";

  if (
    !parsedJsonFeed ||
    !Array.isArray(parsedJsonFeed) ||
    parsedJsonFeed.length === 0
  ) {
    console.error("Invalid or empty JSON feed");
    return transcript;
  }

  transcript += `## Summary \n`;

  for (let i = 0; i < parsedJsonFeed.length; i++) {
    const feedEntry = parsedJsonFeed[i];

    if (!feedEntry.Timestamp) {
      console.error(`Timestamp is missing for entry ${i}`);
      continue;
    }
    if (source === "youtube") {
      const timestampinSeconds = await convertTimestampToSeconds(
        feedEntry.Timestamp
      );

      transcript += `### [${feedEntry.Header}](https://www.youtube.com/watch?v=${videoId}&t=${timestampinSeconds})\n`;
    } else {
      transcript += `### ${feedEntry.Header}\n`;
    }

    if (Array.isArray(feedEntry.Content)) {
      const contentString = feedEntry.Content.join(" ");
      transcript += `${contentString}\n`;
    } else if (typeof feedEntry.Content === "string") {
      transcript += `${feedEntry.Content}\n`;
    } else {
      console.error(`Content is neither an array nor a string for entry ${i}`);
    }

    //  transcript += `*${feedEntry.Timestamp}*\n`;

    const currentStartTime = convertTimestampToSeconds(feedEntry.Timestamp);
    const nextStartTime = parsedJsonFeed[i + 1]
      ? convertTimestampToSeconds(parsedJsonFeed[i + 1].Timestamp)
      : Infinity;

    const videoDir = path.resolve(__dirname, "../docs", videoId);
    const imagesDir = path.join(videoDir, "images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    for (let screenshotTime of screenshotTimestamps) {
      if (screenshotTime === null) continue;

      if (
        screenshotTime >= currentStartTime &&
        screenshotTime < nextStartTime
      ) {
        const imageFilename = `${screenshotTime}.jpg`;
        const imagePath = path.join(imagesDir, imageFilename);

        // Check if image exists before adding it to the transcript
        if (fs.existsSync(imagePath)) {
          transcript += `![Screenshot](${path.join("../images", imageFilename)})\n`;
        }
      }
    }
  }

    return transcript;
  } catch (error) {
    console.error(`Error creating outline section: ${error.message}`);
    throw error;
  }
}

// Function to create a summary section of the transcript
// Takes parsed JSON summary feed as an argument
async function createSummarySection(parsedJsonSummaryFeed) {
  console.log("Made it to createSummarySection");
  let transcript = ""; // Initialize transcript as an empty string

  // Check if the parsed JSON summary feed is not empty and is an array
  if (
    !parsedJsonSummaryFeed ||
    !Array.isArray(parsedJsonSummaryFeed) ||
    parsedJsonSummaryFeed.length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return transcript; // Return the transcript
  }

  transcript += `## Key Points \n`; // Add a header to the transcript

  // Loop through each entry in the parsed JSON summary feed
  for (let i = 0; i < parsedJsonSummaryFeed.length; i++) {
    const summaryEntry = parsedJsonSummaryFeed[i]; // Get the current summary entry

    // Check if the summary entry is null, skip to the next iteration
    if (summaryEntry === null) {
      continue;
    }

    // Check if the summary entry is an object and has a header, content, and timestamp
    if (
      typeof summaryEntry !== "object" ||
      !summaryEntry.Header ||
      !summaryEntry.Content
    ) {
      console.error(
        `Invalid entry or Header, Content or Timestamp is missing for entry ${i}`
      ); // Log an error if the entry is invalid or header, content, or timestamp is missing
      continue; // Skip to the next iteration
    }

    transcript += `**${summaryEntry.Header}** - \n `; // Add the summary entry header to the transcript

    // Check if the summary entry content is an array or a string
    if (
      Array.isArray(summaryEntry.Content) ||
      typeof summaryEntry.Content === "string"
    ) {
      const bulletContent = convertContentToBullets(summaryEntry.Content); // Convert the content to bullet points
      transcript += `${bulletContent}\n`; // Add the bullet content to the transcript
    } else {
      console.error(`Content is neither an array nor a string for entry ${i}`); // Log an error if content is neither an array nor a string
    }

    transcript += `\n`; // Add the summary entry timestamp to the transcript
  }
  return transcript; // Return the transcript
}

// Function to create a glossary section of the transcript
// Takes parsed JSON glossary feed as an argument
async function createGlossarySection(parsedJsonGlossaryFeed) {
  let transcript = ""; // Initialize transcript as an empty string

  // Check if parsedJsonGlossaryFeed is not null, not empty and is a valid JSON
  if (
    !parsedJsonGlossaryFeed ||
    !Array.isArray(parsedJsonGlossaryFeed) ||
    parsedJsonGlossaryFeed.length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return transcript; // Return the transcript
  }

  transcript += `## Glossary \n`; // Add a header to the transcript

  // Loop through each entry in the parsed JSON glossary feed
  for (let i = 0; i < parsedJsonGlossaryFeed.length; i++) {
    const glossaryEntry = parsedJsonGlossaryFeed[i]; // Get the current glossary entry

    // Check if the summary entry is null, skip to the next iteration
    if (glossaryEntry === null) {
      continue;
    }

    // Check if the glossary entry has a term and definition
    if (!glossaryEntry.Term || !glossaryEntry.Definition) {
      console.error(`Term or Definition is missing for entry ${i}`); // Log an error if term or definition is missing
      continue; // Skip to the next iteration
    }

    transcript += `**${glossaryEntry.Term}:** ${glossaryEntry.Definition}\n\n`; // Add the glossary entry to the transcript
  }
  return transcript; // Return the transcript
}

// Function to create a FAQ section of the transcript
// Takes parsed JSON FAQ feed as an argument
async function createFaqSection(parsedJsonFaqFeed) {
  let transcript = ""; // Initialize transcript as an empty string

  // Check if parsedJsonFaqFeed is not null, not empty and is a valid JSON
  if (
    !parsedJsonFaqFeed ||
    !Array.isArray(parsedJsonFaqFeed) ||
    parsedJsonFaqFeed.length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return transcript; // Return the transcript
  }

  transcript += `## FAQs \n`; // Add a header to the transcript

  // Loop through each entry in the parsed JSON FAQ feed
  for (let i = 0; i < parsedJsonFaqFeed.length; i++) {
    const faqEntry = parsedJsonFaqFeed[i]; // Get the current FAQ entry

    // Check if the summary entry is null, skip to the next iteration
    if (faqEntry === null) {
      continue;
    }

    // Check if the FAQ entry has a question and answer
    if (!faqEntry.Question || !faqEntry.Answer) {
      console.error(`Question or Answer is missing for entry ${i}`); // Log an error if question or answer is missing
      continue; // Skip to the next iteration
    }

    transcript += `**${faqEntry.Question}**\n ${faqEntry.Answer}\n\n\n\n`; // Add the FAQ entry to the transcript
  }
  return transcript; // Return the transcript
}

// Function to create a TL;DR section of the transcript
// Takes parsed JSON TL;DR feed as an argument
async function createTldrSection(parsedJsonTldrFeed) {
  let transcript = ""; // Initialize transcript as an empty string

  // Check if parsedJsonTldrFeed is not null, not empty and is a valid JSON
  if (
    !parsedJsonTldrFeed ||
    !Array.isArray(parsedJsonTldrFeed) ||
    parsedJsonTldrFeed.length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return transcript; // Return the transcript
  }

  // Loop through each entry in the parsed JSON TL;DR feed
  for (let i = 0; i < 1; i++) {
    const tldrEntry = parsedJsonTldrFeed[i]; // Get the current TL;DR entry

    // Check if the summary entry is null, skip to the next iteration
    if (tldrEntry === null) {
      continue;
    }

    // Check if the TL;DR entry has a title and content
    if (!tldrEntry.Title || !tldrEntry.Content) {
      console.error(`Title or Content is missing for entry ${i}`); // Log an error if title or content is missing
      continue; // Skip to the next iteration
    }

    transcript += `${tldrEntry.Content}\n\n`; // Add the TL;DR entry to the transcript
  }
  return transcript; // Return the transcript
}

// Function to create a Resource section of the transcript
// Takes parsed JSON Resource feed as an argument
async function createResourceSection(parsedJsonResourceFeed) {
  let transcript = ""; // Initialize transcript as an empty string

  // Check if parsedJsonResourceFeed is not null, not empty and is a valid JSON
  if (
    !parsedJsonResourceFeed ||
    !Array.isArray(parsedJsonResourceFeed) ||
    parsedJsonResourceFeed.length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return transcript; // Return the transcript
  }

  transcript += `## Resources \n`; // Add a header to the transcript

  // Loop through each entry in the parsed JSON Resource feed
  for (let i = 0; i < parsedJsonResourceFeed.length; i++) {
    const resourceEntry = parsedJsonResourceFeed[i]; // Get the current Resource entry

    // Check if the resource entry is null, skip to the next iteration
    if (resourceEntry === null) {
      continue;
    }

    // Check if the Resource entry has a title and content
    if (!resourceEntry.ResourceName || !resourceEntry.ResourceDetails) {
      console.error(`Title or Content is missing for entry ${i}`); // Log an error if title or content is missing
      continue; // Skip to the next iteration
    }

    transcript += `**${resourceEntry.ResourceName}**: ${resourceEntry.ResourceDetails}\n\n`; // Add the Resource entry to the transcript
  }
  return transcript; // Return the transcript
}

// Function to create a slides section of the transcript
// Takes parsed JSON slides feed as an argument
async function createSlidesSection(parsedJsonSlidesFeed) {
  let transcript = ""; // Initialize transcript as an empty string

  // Check if parsedJsonSlidesFeed is not null, not empty and is a valid JSON
  if (
    !parsedJsonSlidesFeed ||
    !Array.isArray(parsedJsonSlidesFeed) ||
    parsedJsonSlidesFeed.length === 0
  ) {
    console.error("Invalid or empty JSON feed"); // Log an error if the JSON feed is invalid or empty
    return transcript; // Return the transcript
  }

  transcript += `## Slides \n`; // Add a header to the transcript

  // Loop through each entry in the parsed JSON slides feed
  for (let i = 0; i < parsedJsonSlidesFeed.length; i++) {
    const slidesEntry = parsedJsonSlidesFeed[i]; // Get the current slides entry

    if (slidesEntry === null) {
      continue;
    }

    // Add available fields to the transcript
    if (slidesEntry.Title) {
      transcript += `### ${slidesEntry.Title}\n\n`;
    }

    if (slidesEntry.Content) {
      transcript += `${convertContentToBullets(slidesEntry.Content)}\n\n`;
    }

    if (slidesEntry.Visual) {
      transcript += `**Visual:** ${slidesEntry.Visual}\n\n`;
    }

    if (slidesEntry.Explanation) {
      transcript += `**Explanation:** ${slidesEntry.Explanation}\n\n`;
    }

    if (slidesEntry.Timestamp) {
      transcript += `**Timestamp:** ${slidesEntry.Timestamp}\n\n`;
    } // Add the slides entry to the transcript
  }
  return transcript; // Return the transcript
}



module.exports = {
  createOutlineSection,
  createSummarySection,
  createGlossarySection,
  createFaqSection,
  createTldrSection,
  createResourceSection,
  createSlidesSection
};
