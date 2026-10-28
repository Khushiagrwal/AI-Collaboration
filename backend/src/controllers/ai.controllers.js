
const { generateDiagram } = require("../services/aiService");

const {
  getRecentMessages,
  saveMessage
} = require("../services/conversation.service");

const {
  canEditBoard,
  findAccessibleBoard
} = require("../services/board-access.service");

const {
  processConversationMemory
} = require("../services/conversation-memory-processor.service");

const {
  retrieveConversationMemories
} = require("../services/conversation-memory.service");

exports.generateDiagramController = async (req, res) => {
  try {
    const { prompt, boardId } = req.body;

    // 1. Validate input
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required"
      });
    }

    if (!boardId) {
      return res.status(400).json({
        success: false,
        message: "Board ID is required"
      });
    }

    // 2. Get authenticated user
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found"
      });
    }

    const cleanPrompt = prompt.trim();
    const normalizedUserId = String(userId);
    const normalizedBoardId = String(boardId);

    // 3. Verify board access and edit permission
    const board = await findAccessibleBoard(boardId, userId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found or you don't have access"
      });
    }

    if (!canEditBoard(board, userId)) {
      return res.status(403).json({
        success: false,
        message: "Viewer access cannot generate diagrams"
      });
    }

    // 4. Load previous conversation history
    const history = await getRecentMessages(boardId, userId);

    // 5. Save the current user prompt
    await saveMessage(
      boardId,
      userId,
      "user",
      cleanPrompt
    );

    // 6. Extract and store useful long-term memories
    // Run asynchronously so extraction doesn't block generation.
    void processConversationMemory({
      prompt: cleanPrompt,
      userId: normalizedUserId,
      boardId: normalizedBoardId
    }).catch((error) => {
      console.error(
        "Conversation memory processing failed:",
        error.message
      );
    });

    // 7. Retrieve relevant existing memories
    let relevantMemories = [];

    try {
      relevantMemories = await retrieveConversationMemories({
        query: cleanPrompt,
        userId: normalizedUserId,
        boardId: normalizedBoardId,
        limit: 5
      });

    } catch (error) {
      console.error(
        "Memory retrieval failed:",
        error.message
      );
    }

    // 8. Generate diagram using STM + LTM
    const result = await generateDiagram(
      cleanPrompt,
      history,
      relevantMemories
    );

    // 9. Save assistant response
    await saveMessage(
      boardId,
      userId,
      "assistant",
      JSON.stringify(result)
    );

    // 10. Return result
    return res.status(200).json({
      success: true,
      result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate diagram",
      error: err.message
    });
  }
};