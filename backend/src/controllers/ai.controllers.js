const { generateDiagram } = require("../services/aiService");

exports.generateDiagramController = async (req, res) => {
  try {
    const { prompt } = req.body;

    const result = await generateDiagram(prompt);

    res.status(200).json({
      success: true,
      result,
    });
  } catch (err) {
    console.error("AI Controller Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to generate diagram",
      error: err.message,
    });
  }
};
