
const express = require("express");
const router = express.Router();

const aiRateLimiter=require("../middleware/aiRateLimiter")
const {
  generateDiagramController
} = require("../controllers/ai.controllers");

const authMiddleware = require("../middleware/auth");

router.post(
  "/generate-diagram",
  authMiddleware,
  aiRateLimiter,
  generateDiagramController
);

module.exports = router;
