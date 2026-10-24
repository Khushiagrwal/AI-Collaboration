
const rateLimit = require("express-rate-limit");

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5, // Maximum 5 requests per minute
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many AI requests. Please try again after a minute."
  }
});

module.exports = aiRateLimiter;
