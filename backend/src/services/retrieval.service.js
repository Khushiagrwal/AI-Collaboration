
const qdrant = require("./qdrant.service");
const { COLLECTION_NAME } = require("./vector-store.service");

const retrieveRelevantChunks = async ({
  queryEmbedding,
  documentId,
  limit = 5
}) => {
  // 1. Validate query embedding
  if (
    !Array.isArray(queryEmbedding) ||
    queryEmbedding.length !== 3072 ||
    !queryEmbedding.every(
      (value) => Number.isFinite(value)
    )
  ) {
    throw new Error("Invalid query embedding");
  }

  // 2. Validate result limit
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 20
  ) {
    throw new Error("Limit must be between 1 and 20");
  }

  if (typeof documentId !== "string" || !documentId.trim()) {
    throw new Error("A document ID is required for retrieval");
  }

  // 3. Filter results by document ID
  const filter = {
    must: [
      {
        key: "documentId",
        match: {
          value: documentId
        }
      }
    ]
  };

  // 4. Search for semantically similar chunks
  const response = await qdrant.query(
    COLLECTION_NAME,
    {
      query: queryEmbedding,
      limit,
      with_payload: true,
      filter
    }
  );

  // 5. Extract matching points
  const results = response.points ?? response;

  // 6. Return only the required fields
  return results.map((result) => ({
    documentId: result.payload?.documentId,
    documentName: result.payload?.documentName,
    chunkIndex: result.payload?.chunkIndex,
    text: result.payload?.text,
    score: result.score
  }));
};

module.exports = {
  retrieveRelevantChunks
};
