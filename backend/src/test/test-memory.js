
const {
  initializeConversationMemoryStore
} = require("../services/conversation-memory.service");

const qdrant = require("../services/qdrant.service");

async function main() {
  // Create the collection and its payload indexes first.
  await initializeConversationMemoryStore();

  const result = await qdrant.getCollections();
  const memories = await qdrant.scroll("conversation_memories", {
    limit: 10,
    with_payload: true,
    with_vector: false
  });

  console.log(
    "Saved memories:",
    memories.points.map((point) => point.payload)
  );
}

main().catch((error) => {
  console.error("Memory test failed:", error.message);
  process.exitCode = 1;
});
