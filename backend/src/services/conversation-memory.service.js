
const { randomUUID } = require("crypto");
const qdrant = require("./qdrant.service");
const { generateEmbedding } = require("./embedding.service");

const COLLECTION_NAME = "conversation_memories";
const VECTOR_SIZE = 3072;

let initializationPromise;

async function initializeConversationMemoryStore() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const result = await qdrant.getCollections();

      const exists = result.collections.some(
        (collection) => collection.name === COLLECTION_NAME
      );

      if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: "Cosine"
          }
        });
      }

      // Index fields used for memory-scope filtering.
      for (const field of ["userId", "scope", "boardId"]) {
        try {
          await qdrant.createPayloadIndex(COLLECTION_NAME, {
            field_name: field,
            field_schema: "keyword",
            wait: true
          });
        } catch (error) {
          // A repeated initialization may encounter an existing index.
          const collection = await qdrant.getCollection(COLLECTION_NAME);
          if (!collection.payload_schema?.[field]) {
            throw error;
          }
        }
      }
    })().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }

  return initializationPromise;
}

async function storeConversationMemory({
  text,
  userId,
  boardId,
  scope = "board",
  category = "project_fact"
}) {
  if (!text?.trim() || !userId) {
    throw new Error("Memory text and userId are required");
  }

  if (!["board", "user"].includes(scope)) {
    throw new Error("Invalid memory scope");
  }

  if (scope === "board" && !boardId) {
    throw new Error("boardId is required for board-scoped memories");
  }

  await initializeConversationMemoryStore();

  const embedding = await generateEmbedding(text.trim());

  if (embedding.length !== VECTOR_SIZE) {
    throw new Error(
      `Expected ${VECTOR_SIZE} embedding dimensions, received ${embedding.length}`
    );
  }

  const point = {
    id: randomUUID(),
    vector: embedding,
    payload: {
      text: text.trim(),
      userId: String(userId),
      scope,
      ...(scope === "board" ? { boardId: String(boardId) } : {}),
      category,
      createdAt: new Date().toISOString()
    }
  };

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: [point]
  });

  return point.id;
}

async function retrieveConversationMemories({
  query,
  userId,
  boardId,
  limit = 5
}) {
  if (!query?.trim() || !userId) {
    throw new Error("Query and userId are required");
  }

  await initializeConversationMemoryStore();

  const embedding = await generateEmbedding(query.trim());

  if (embedding.length !== VECTOR_SIZE) {
    throw new Error(
      `Expected ${VECTOR_SIZE} embedding dimensions, received ${embedding.length}`
    );
  }

  const filter = {
    must: [
      {
        key: "userId",
        match: { value: String(userId) }
      }
    ],
    should: boardId
      ? [
          {
            key: "scope",
            match: { value: "user" }
          },
          {
            key: "boardId",
            match: { value: String(boardId) }
          }
        ]
      : [
          {
            key: "scope",
            match: { value: "user" }
          }
        ]
  };

  const result = await qdrant.query(COLLECTION_NAME, {
    query: embedding,
    filter,
    limit: Math.min(Math.max(Number(limit) || 5, 1), 10),
    with_payload: true
  });

  return (result.points || [])
    .filter((point) => point.payload?.text)
    .map((point) => ({
      text: point.payload.text,
      scope: point.payload.scope,
      category: point.payload.category,
      score: point.score
    }));
}

module.exports = {
  COLLECTION_NAME,
  initializeConversationMemoryStore,
  storeConversationMemory,
  retrieveConversationMemories
};
