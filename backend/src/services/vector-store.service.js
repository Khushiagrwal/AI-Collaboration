
const { randomUUID } = require("crypto");
const qdrant = require("./qdrant.service");

const COLLECTION_NAME = "whiteboard_documents";
const VECTOR_SIZE = 3072;
let initializationPromise;

const createCollectionIfNotExists = async () => {
  const result = await qdrant.getCollections();

  const exists = result.collections.some(
    (collection) => collection.name === COLLECTION_NAME
  );

  if (exists) {
    console.log("Qdrant collection already exists");
    return;
  }

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: VECTOR_SIZE,
      distance: "Cosine"
    }
  });

  console.log("Qdrant collection created successfully");
};

const storeChunks = async (chunks, documentId, documentName) => {
  if (!chunks.length) {
    throw new Error("No chunks available to store");
  }

  const points = chunks.map((chunk) => {
    if (
      !Array.isArray(chunk.embedding) ||
      chunk.embedding.length !== VECTOR_SIZE
    ) {
      throw new Error(
        `Invalid embedding dimensions for chunk ${chunk.chunkIndex}`
      );
    }

    return {
      id: randomUUID(),
      vector: chunk.embedding,
      payload: {
        documentId,
        documentName,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        start: chunk.start,
        end: chunk.end
      }
    };
  });

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points
  });

  return points.length;
};


const createDocumentIdIndex = async () => {
  try {
    const collection = await qdrant.getCollection(COLLECTION_NAME);
    const existingIndex = collection.payload_schema?.documentId;

    if (existingIndex) {
      if (!["keyword", "uuid"].includes(existingIndex.data_type)) {
        throw new Error(
          `Qdrant documentId index has unsupported type "${existingIndex.data_type}"`
        );
      }

      console.log(
        `[Qdrant Setup] documentId payload index already exists (${existingIndex.data_type})`
      );
      return;
    }

    try {
      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name: "documentId",
        field_schema: "keyword",
        wait: true
      });
    } catch (creationError) {
      let updatedCollection;

      try {
        updatedCollection = await qdrant.getCollection(COLLECTION_NAME);
      } catch (verificationError) {
        throw new AggregateError(
          [creationError, verificationError],
          "Could not verify whether the documentId payload index was created"
        );
      }

      const concurrentIndex = updatedCollection.payload_schema?.documentId;

      if (
        concurrentIndex &&
        ["keyword", "uuid"].includes(concurrentIndex.data_type)
      ) {
        console.log(
          `[Qdrant Setup] documentId payload index already exists (${concurrentIndex.data_type})`
        );
        return;
      }

      throw creationError;
    }

    console.log("[Qdrant Setup] documentId payload index created (keyword)");
  } catch (error) {
    console.error("[Qdrant Index Setup] Failed to ensure documentId index:", error);
    throw error;
  }
};

const initializeVectorStore = () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        await createCollectionIfNotExists();
        await createDocumentIdIndex();
      } catch (error) {
        initializationPromise = undefined;
        throw error;
      }
    })();
  }

  return initializationPromise;
};

module.exports = {
  COLLECTION_NAME,
  createCollectionIfNotExists,
  initializeVectorStore,
  storeChunks
};
