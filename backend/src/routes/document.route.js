const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  uploadDocument
} = require("../controllers/document.controllers");
const { answerDocumentQuestion } = require("../controllers/document-answer.controller");
const authMiddleware = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const {
  retrieveDocuments
} = require("../controllers/retrieval.controller")
router.post("/retrieve", authMiddleware, retrieveDocuments);

router.post("/answer", authMiddleware, answerDocumentQuestion);
router.post("/upload", authMiddleware, upload.single("document"), uploadDocument);

module.exports = router;