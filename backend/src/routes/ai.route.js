
const express = require("express");
const router = express.Router();

const {
  generateDiagramController
} = require("../controllers/ai.controllers");

const authMiddleware = require("../middleware/auth");

router.post(
  "/generate-diagram",
  authMiddleware,
  generateDiagramController
);

module.exports = router;
