const express= require('express');
const router= express.Router();
const {createInvitation,getInvitationByToken,acceptInvitation}=require("../controllers/invite.controllers")
const authMiddleware = require("../middleware/auth");

router.post("/share", authMiddleware, createInvitation)
router.get("/:token", getInvitationByToken);
router.post("/:token/accept",authMiddleware,acceptInvitation);

module.exports=router;