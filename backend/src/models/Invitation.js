const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    // Kis board ke liye invitation hai
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },

    // Jisko invite bheja gaya hai
    invitedEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Unique invitation link ke liye
    token: {
      type: String,
      required: true,
      unique: true,
    },

    // User ko kya permission milegi
    role: {
      type: String,
      enum: ["viewer", "editor"],
      default: "editor",
    },

    // Invitation ki current state
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },

    // Kis user ne invitation accept kiya
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Link kab expire hoga
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invitation", invitationSchema);