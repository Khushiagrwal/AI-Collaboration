
const path = require("path");
const { randomUUID } = require("crypto");
const Document = require("../models/Document");
const { findAccessibleBoard } = require("../services/document-access.service");

const BOARD_ID_PATTERN = /^[0-9a-f]{24}$/i;

const {
  generateEmbedding
} = require("../services/embedding.service");

const {
  initializeVectorStore,
  storeChunks
} = require("../services/vector-store.service");

// Split document text into overlapping chunks
const createChunks = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);

    chunks.push({
      chunkIndex: chunks.length,
      text: text.slice(start, end),
      start,
      end
    });

    if (end === text.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
};

const uploadDocument = async (req, res) => {
  try {
    const { boardId } = req.body ?? {};

    if (typeof boardId !== "string" || !BOARD_ID_PATTERN.test(boardId)) {
      return res.status(400).json({
        success: false,
        message: "A valid board ID is required"
      });
    }

    const board = await findAccessibleBoard(boardId, req.user.id);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found or you don't have access"
      });
    }

    // 1. Check uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a TXT file"
      });
    }

    // 2. Validate file extension
    const extension = path.extname(req.file.originalname).toLowerCase();

    if (extension !== ".txt") {
      return res.status(400).json({
        success: false,
        message: "Only TXT files are supported at this stage"
      });
    }

    // 3. Extract text
    const extractedText = req.file.buffer.toString("utf8").trim();

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file is empty"
      });
    }

    // 4. Create text chunks
    const chunks = createChunks(extractedText);

    // Ensure the collection and its documentId filter index exist before processing.
    await initializeVectorStore();

    // 5. Generate embeddings for every chunk
    const chunksWithEmbeddings = [];

    for (const chunk of chunks) {
      let embedding;

      try {
        embedding = await generateEmbedding(chunk.text);
      } catch (error) {
        console.error(
          `[Document Upload] Embedding generation failed for chunk ${chunk.chunkIndex}:`,
          error
        );
        throw error;
      }

      chunksWithEmbeddings.push({
        ...chunk,
        embedding
      });
    }

    // 7. Generate a unique ID for this document
    const documentId = randomUUID();

    // 8. Store vectors and their text in Qdrant
    const storedChunks = await storeChunks(
      chunksWithEmbeddings,
      documentId,
      req.file.originalname
    );

    await Document.create({
      documentId,
      name: req.file.originalname,
      board: board._id,
      uploadedBy: req.user.id
    });

    // 9. Return processing summary
    return res.status(200).json({
      success: true,
      message: "Document processed and stored successfully",
      document: {
        documentId,
        name: req.file.originalname,
        characters: extractedText.length,
        totalChunks: chunks.length,
        embeddedChunks: chunksWithEmbeddings.length,
        storedChunks,
        embeddingDimensions:
          chunksWithEmbeddings[0]?.embedding.length ?? 0
      }
    });
  } catch (error) {
    console.error("Document processing error:", error);

    return res.status(500).json({
      success: false,
      message: "Document processing or storage failed"
    });
  }
};

module.exports = {
  uploadDocument
};
