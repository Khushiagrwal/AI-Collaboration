const express= require('express');
const router= express.router();
const authMiddleware = require("../middleware/auth");
const {getBoard,getBoards,createBoard,updateBoard,deleteBoard}=require("../controllers/board.controllers");

router.post("/", authMiddleware, createBoard);
router.get("/", authMiddleware, getBoards);
router.get("/:id", authMiddleware, getBoard);
router.put("/:id", authMiddleware, updateBoard);
router.delete("/:id", authMiddleware, deleteBoard);

module.exports=router;