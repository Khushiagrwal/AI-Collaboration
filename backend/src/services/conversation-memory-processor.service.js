
const { extractMemories } = require("./memory-extraction.service");

const {
  storeConversationMemory
} = require("./conversation-memory.service");

async function processConversationMemory({
  prompt,
  userId,
  boardId
}) {
  const memories = await extractMemories(prompt);
  let savedCount = 0;

  for (const memory of memories) {
    await storeConversationMemory({
      text: memory.text,
      userId: String(userId),
      boardId: memory.scope === "board" ? String(boardId) : undefined,
      scope: memory.scope,
      category: memory.category
    });

    savedCount++;
  }
  return { extractedCount: memories.length, savedCount };
}

module.exports = { processConversationMemory };

