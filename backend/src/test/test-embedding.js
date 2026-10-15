
require("dotenv").config();

const { generateEmbedding } = require("../services/embedding.service");

async function test() {
  const vector = await generateEmbedding(
    "JWT tokens are used for authentication."
  );

  console.log("Embedding length:", vector.length);
  console.log("First 5 numbers:", vector.slice(0, 5));
}

test().catch(console.error);
