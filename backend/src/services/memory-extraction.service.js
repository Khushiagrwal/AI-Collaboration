
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "..", "..", ".env")
});

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function extractMemories(prompt) {
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return [];
  }
  
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `
You extract useful long-term memories from whiteboard AI conversations.

Keep only information that will help future conversations, such as:
- Stable user preferences
- Important project decisions
- Ongoing project requirements

Do not save:
- Greetings or casual chat
- Temporary questions
- Generic facts
- Sensitive personal information
- Instructions that are only relevant to this one request

Return ONLY a JSON array of objects in this format:
[
  {
    "text": "A short, clear fact useful in future conversations",
    "scope": "board",
    "category": "project_fact"
  }
]

Use scope "board" for project-specific facts and "user" for non-sensitive, reusable preferences.
If there is nothing worth remembering, return [].

User prompt:
${prompt.trim()}
`
  });

  const text = response.text?.trim();
  console.log("this is text",text);
  if (!text) return [];

  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const memories = JSON.parse(cleaned);

    if (!Array.isArray(memories)) return [];
    console.log("this is memories",memories)
    return memories.filter(
      (memory) =>
        memory &&
        typeof memory.text === "string" &&
        memory.text.trim() &&
        ["board", "user"].includes(memory.scope) &&
        typeof memory.category === "string"
    );
  } catch (error) {
    console.error("Memory extraction returned invalid JSON:", error.message);
    return [];
  }
}

module.exports = { extractMemories };
