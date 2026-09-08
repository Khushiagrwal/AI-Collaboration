const crypto = require("crypto");
const Invitation = require("../models/Invitation");
const Board = require("../models/Board");
const User = require("../models/User")
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const createInvitation = async (req, res) => {
  try {
    const { boardId, email, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
   
    // Check required fields
    if (!boardId || !normalizedEmail) {
      return res.status(400).json({
        message: "Board ID and email are required",
      });
    }

    // Find board
    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    // Only board owner can invite
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only board owner can invite users",
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");

    // Invitation expires after 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await Invitation.create({
      board: boardId,
      invitedEmail: normalizedEmail,
      role: role || "editor",
      token,
      expiresAt,
    });

    // Generate invitation link
    const invitationLink = `${process.env.FRONTEND_URL}/invite/${token}`;
    console.log(invitationLink)
    res.status(201).json({
      message: "Invitation created successfully",
      invitationLink,
      invitation,
    });
  } catch (error) {
    console.error("Create invitation error:", error);

    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};
const getInvitationByToken = async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();

    const invitation = await Invitation.findOne({ token })
      .populate("board", "title");

    if (!invitation) {
      return res.status(404).json({
        message: "This invitation link is invalid or was created on another server.",
      });
    }

    if (!['pending', 'accepted'].includes(invitation.status)) {
      return res.status(400).json({
        message: "Invitation is no longer active",
      });
    }

    if (invitation.status === "pending" && new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();

      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    return res.status(200).json({
      success: true,
      invitation: {
        boardId: invitation.board._id,
        boardTitle: invitation.board.title,
        invitedEmail: invitation.invitedEmail,
        role: invitation.role,
      },
    });

  } catch (error) {
    console.error("Get invitation error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
const acceptInvitation = async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();

    // Find invitation
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({
        message: "This invitation link is invalid or was created on another server. Please ask the board owner for a new link.",
      });
    }

    // Check expiry
    if (invitation.status === "pending" && new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();

      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    // Find logged-in user
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check invited email
    if (user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      return res.status(403).json({
        message: "This invitation belongs to another email. Please log in with the invited email address.",
      });
    }

    // Find board
    const board = await Board.findById(invitation.board);

    if (!board) {
      return res.status(404).json({
        message: "The board for this invitation no longer exists. Please ask the owner for a new invitation.",
      });
    }

    const isOwner = board.owner.toString() === userId.toString();

    // Check if already participant
    const alreadyParticipant = board.participants.some(
      (participant) =>
        participant.toString() === userId.toString()
    );

    if (!alreadyParticipant && !isOwner) {
      board.participants.push(userId);
      await board.save();
    }

    if (invitation.status === "pending") {
      invitation.status = "accepted";
      invitation.acceptedBy = userId;
      await invitation.save();
    }

    return res.status(200).json({
      success: true,
      message: alreadyParticipant || isOwner
        ? "You already have access to this board"
        : "Invitation accepted successfully",
      boardId: board._id,
    });

  } catch (error) {
    console.error("Accept invitation error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
module.exports = {
  createInvitation,getInvitationByToken,acceptInvitation
};