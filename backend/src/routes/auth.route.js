const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser
} = require("../controllers/auth.controllers");
const aiRateLimiter = require("../middleware/aiRateLimiter");

router.post("/register", registerUser);
router.post("/login",aiRateLimiter, loginUser);

module.exports = router;