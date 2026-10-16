const { findAccessibleDocument } = require("../services/document-access.service");
const { generateEmbedding } = require("../services/embedding.service");
const { retrieveRelevantChunks } = require("../services/retrieval.service");
const { initializeVectorStore } = require("../services/vector-store.service");
const { generateDocumentAnswer } = require("../services/aiService");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const answerDocumentQuestion = async (req, res) => {
  const { question, documentId, limit = 5 } = req.body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      success: false,
      message: "Question is required"
    });
  }

  if (typeof documentId !== "string" || !UUID_PATTERN.test(documentId.trim())) {
    return res.status(400).json({
      success: false,
      message: "A valid document ID is required"
    });
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    return res.status(400).json({
      success: false,
      message: "Limit must be an integer between 1 and 20"
    });
  }

  const normalizedDocumentId = documentId.trim();

  try {
    const document = await findAccessibleDocument(normalizedDocumentId, req.user.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found or you don't have access"
      });
    }
  } catch (error) {
    console.error("[Document QA] Authorization lookup failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not verify document access"
    });
  }

  let chunks;
  try {
    await initializeVectorStore();
    const queryEmbedding = await generateEmbedding(question.trim());
    chunks = await retrieveRelevantChunks({
      queryEmbedding,
      documentId: normalizedDocumentId,
      limit
    });
  } catch (error) {
    console.error("[Document QA] Document retrieval failed:", error);
    return res.status(502).json({
      success: false,
      message: "Could not retrieve document content"
    });
  }

  const excerpts = chunks.filter(chunk =>
    typeof chunk.text === "string" && chunk.text.trim()
  );
  const sources = excerpts.map(chunk => ({
    ...(typeof chunk.documentName === "string" ? { documentName: chunk.documentName } : {}),
    ...(Number.isInteger(chunk.chunkIndex) ? { chunkIndex: chunk.chunkIndex } : {}),
    ...(Number.isFinite(chunk.score) ? { score: chunk.score } : {})
  }));

  if (!excerpts.length) {
    return res.status(200).json({
      success: true,
      question: question.trim(),
      documentId: normalizedDocumentId,
      answer: "I couldn't find relevant information in the available document excerpts to answer this question.",
      sources: []
    });
  }

  try {
    const answer = await generateDocumentAnswer(
      question.trim(),
      excerpts.map(({ documentName, chunkIndex, text }) => ({
        documentName,
        chunkIndex,
        text
      }))
    );

    return res.status(200).json({
      success: true,
      question: question.trim(),
      documentId: normalizedDocumentId,
      answer,
      sources
    });
  } catch (error) {
    console.error("[Document QA] Gemini answer generation failed:", error);
    return res.status(502).json({
      success: false,
      message: "Could not generate an answer from the document"
    });
  }
};

module.exports = { answerDocumentQuestion };
