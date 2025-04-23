import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Initialize environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Generate AI response
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { prompt, context = "", codeToModify = "" } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Create a system message with context
    const systemMessage = `You are an AI assistant for game development coding. 
    You help users write, modify, and debug code for games.
    Keep your responses concise, clear, and focused on the user's request.
    When modifying code, explain the changes briefly.`;

    // Format the user's prompt with code if provided
    let userPrompt = prompt;
    if (codeToModify) {
      userPrompt += `\n\nHere's the code to modify:\n\`\`\`\n${codeToModify}\n\`\`\``;
    }

    if (context) {
      userPrompt = `${context}\n\n${userPrompt}`;
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Or use a different model as needed
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    // Get the response content
    const aiResponse = response.choices[0].message.content;

    // Return the AI response
    res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error("Error generating AI response:", error);
    res
      .status(500)
      .json({
        error: "Failed to generate AI response",
        details: error.message,
      });
  }
});

// Generate code modifications
app.post("/api/ai/modify-code", async (req, res) => {
  try {
    const { instruction, code, language = "javascript" } = req.body;

    if (!instruction || !code) {
      return res
        .status(400)
        .json({ error: "Instruction and code are required" });
    }

    // Create a system message specifically for code modification
    const systemMessage = `You are an expert code assistant. 
    Modify the provided code according to the user's instructions.
    Return ONLY the modified code without explanations or markdown formatting.
    The code should be ready to use immediately without further editing.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Or use a different model as needed
      messages: [
        { role: "system", content: systemMessage },
        {
          role: "user",
          content: `Please modify this ${language} code according to these instructions: ${instruction}\n\nCode:\n${code}`,
        },
      ],
      temperature: 0.2, // Lower temperature for more deterministic outputs
      max_tokens: 2048,
    });

    // Get the response content
    const modifiedCode = response.choices[0].message.content;

    // Return the modified code
    res.status(200).json({ modifiedCode });
  } catch (error) {
    console.error("Error modifying code:", error);
    res
      .status(500)
      .json({ error: "Failed to modify code", details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
