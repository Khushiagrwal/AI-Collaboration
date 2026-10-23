
const { generateDiagram } = require("../services/aiService");

const {
  getRecentMessages,
  saveMessage
} = require("../services/conversation.service");

exports.generateDiagramController = async (req, res) => {
  try {
    const { prompt, boardId } = req.body;

    // 1. Validate input
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
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

    // 2. Get the authenticated user's ID
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found"
      });
    }

    const cleanPrompt = prompt.trim();

    // 3. Retrieve previous messages BEFORE saving the current prompt
    const history = await getRecentMessages(boardId, userId);

    // 4. Save the current user message
    await saveMessage(
      boardId,
      userId,
      "user",
      cleanPrompt
    );

    // 5. Generate diagram using conversation history
    const result = await generateDiagram(
      cleanPrompt,
      history
    );

    // 6. Save AI response for the next request
    await saveMessage(
      boardId,
      userId,
      "assistant",
      JSON.stringify(result)
    );

    // 7. Return the result
    return res.status(200).json({
      success: true,
      result
    });

  } catch (err) {
    console.error("AI Controller Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to generate diagram",
      error: err.message
    });
  }
};
