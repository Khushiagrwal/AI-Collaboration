const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "..", "..", ".env")
});

const { QdrantClient } = require("@qdrant/js-client-rest");

if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
  throw new Error("QDRANT_URL or QDRANT_API_KEY is missing from .env");
}

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

module.exports = qdrant;
