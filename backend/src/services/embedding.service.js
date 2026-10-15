const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "..", "..", ".env")
});

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const generateEmbedding = async (text) => {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to generate embedding");
  }

  return embedding;
};

module.exports = { generateEmbedding };
