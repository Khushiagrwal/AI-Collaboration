const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  uploadDocument
} = require("../controllers/document.controllers");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const {
  retrieveDocuments
} = require("../controllers/retrieval.controller")
router.post("/retrieve", retrieveDocuments);

router.post("/upload", upload.single("document"), uploadDocument);

module.exports = router;