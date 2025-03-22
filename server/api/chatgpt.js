const express = require('express');
const router = express.Router();
const OpenAI = require("openai");

// Initialize OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Simple function to estimate tokens (1 token ~= 4 characters)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
require('dotenv').config();
const { chunkTranscript, isJsonValid } = require('../utils/transcriptProcessing');
const config = require('../config');

console.log("OpenAI client initialized in chatgpt.js");

router.post('/', async (req, res) => {
  try {
    if (req.method === "POST") {
      console.log("POST request received"); // Debugging line
      let model, tokenchunk, reply, outputFormatValue, chunkResponse;

      const { template, inputsData } = req.body;
      console.log("Template and inputsData:", template, inputsData); // Debugging line
      let instruction = createInstruction(template.inputs, inputsData);
      let mainGoal = template.command;

      if (inputsData["outputformat"]) {
        outputFormatValue = inputsData["outputformat"];
        console.log("Output format:", outputFormatValue); // Debugging line
        if (outputFormatValue === "JSON") {
          mainGoal = template.commandJSON;
        } else if (outputFormatValue === "MARKDOWN") {
          mainGoal = template.commandMARKDOWN;
        } else if (outputFormatValue === "SLIDES") {
          mainGoal = template.commandJSON;
        }
      }

      words = Math.round(instruction.length / 4);
      const tokenCount = Math.ceil(estimateTokens(instruction));
      console.log("Token count:", tokenCount); // Debugging line
        model = "gpt-4o-mini";
        tokenchunk = 6000;
    

      const chunks = await chunkTranscript(instruction, tokenchunk);
      console.log("Chunks:", chunks); // Debugging line
     
      let combinedJsonFeed = [];
    
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1} of ${chunks.length}`); // Debugging line
       
        const messages = [
          {
            role: "system",
            content: "You are a helpful assistant designed to output in " + outputFormatValue,
          },
          {
            role: "user",
            content: `${mainGoal} ${chunks[i]}.`,
          },
        ];

        try {
          console.log("messages: ", messages); // Debugging line
          
          // Create the chat completion with OpenAI
          const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            temperature: 0.6,
          });

          if (!response || !response.choices) {
            console.error("Invalid response structure.");
          }
   
          chunkResponse = response.choices[0]?.message?.content;
          if (!chunkResponse) {
            console.error("Reply content not found.");
          }
        } catch (error) {
          console.error("Error processing chunk:", error);
        }

        if (isJsonValid(chunkResponse)) {
          console.log("Chunk response is valid JSON"); // Debugging line
          combinedJsonFeed = combinedJsonFeed.concat(chunkResponse);
        } else {
          console.log("Chunk response is not valid JSON"); // Debugging line
          combinedJsonFeed = combinedJsonFeed + chunkResponse;
        }
      }
    
      console.log("combinedJsonFeed:", combinedJsonFeed); // Debugging line
    if (isJsonValid(combinedJsonFeed)) {
      console.log("Combined JSON feed is valid"); // Debugging line
      res.status(200).json({ reply: combinedJsonFeed });
    } else {
      console.log("Combined JSON feed is not valid"); // Debugging line
      res.status(200).json({ reply: combinedJsonFeed });
    }
  }
  } catch (err) {
    console.error("Error in POST request:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

function createInstruction(inputs, inputsData) {
  console.log("Creating instruction"); // Debugging line
  return inputs.map((input) => `${input.label}: ${inputsData[input.id]}`).join("\n");
}

module.exports = router;
