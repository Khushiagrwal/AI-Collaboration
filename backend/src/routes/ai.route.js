const {generateDiagramController}=require("../controllers/ai.controllers")
const express = require("express");
const router = express.Router();

router.post("/generate-diagram",generateDiagramController)
module.exports = router;