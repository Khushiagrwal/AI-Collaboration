
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },

    // User ka prompt ya AI ka response
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true,
    _id: true
  }
);

const conversationSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    messages: {
      type: [messageSchema],
      default: []
    },

    activeTask: {
      type: String,
      default: ""
    },

    activeDocumentId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Har user ki ek board par apni conversation hogi.
conversationSchema.index(
  { boardId: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "Conversation",
  conversationSchema
);
