
const { generateEmbedding } = require("../services/embedding.service");

const {
  retrieveRelevantChunks
} = require("../services/retrieval.service");
const {
  initializeVectorStore
} = require("../services/vector-store.service");
const { findAccessibleDocument } = require("../services/document-access.service");

const retrieveDocuments = async (req, res) => {
  try {
    const { question, documentId, limit = 5 } = req.body;

    // 1. Validate question
    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    // 2. Validate document ID
    if (
      typeof documentId !== "string" ||
      !documentId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Document ID is required"
      });
    }

    try {
      const document = await findAccessibleDocument(documentId.trim(), req.user.id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: "Document not found or you don't have access"
        });
      }
    } catch (error) {
      console.error("[Retrieval] Document access lookup failed:", error);
      return res.status(500).json({
        success: false,
        message: "Could not verify document access"
      });
    }

    // 3. Validate limit
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 20
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 20"
      });
    }

    try {
      await initializeVectorStore();
    } catch (error) {
      console.error("[Retrieval] Qdrant index setup failed:", error);

      return res.status(500).json({
        success: false,
        message: "Qdrant document index setup failed"
      });
    }

    console.log("[Retrieval] Step 1: Generating query embedding");

    // 4. Convert user question into a vector
    let queryEmbedding;

    try {
      queryEmbedding = await generateEmbedding(question.trim());
    } catch (error) {
      console.error("[Retrieval] Embedding generation failed:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to generate query embedding"
      });
    }

    console.log(
      "[Retrieval] Step 2: Embedding generated",
      queryEmbedding.length
    );

    console.log("[Retrieval] Step 3: Searching Qdrant");

    // 5. Retrieve relevant document chunks
    let chunks;

    try {
      chunks = await retrieveRelevantChunks({
        queryEmbedding,
        documentId: documentId.trim(),
        limit
      });
    } catch (error) {
      console.error("[Retrieval] Qdrant retrieval failed:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve document chunks"
      });
    }

    console.log(
      "[Retrieval] Step 4: Retrieved chunks",
      chunks.length
    );

    // 6. Send response
    return res.status(200).json({
      success: true,
      question: question.trim(),
      documentId: documentId.trim(),
      count: chunks.length,
      chunks
    });
  } catch (error) {
    console.error("[Retrieval] Request handling failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve document chunks"
    });
  }
};

module.exports = {
  retrieveDocuments
};
