
require("dotenv").config();

const qdrant = require("../services/qdrant.service");

async function testConnection() {
  try {
    const result = await qdrant.getCollections();

    console.log("Qdrant connected successfully!");
    console.log("Collections:", result.collections);
  } catch (error) {
    console.error("Qdrant connection failed:", error.message);
  }
}

testConnection();
