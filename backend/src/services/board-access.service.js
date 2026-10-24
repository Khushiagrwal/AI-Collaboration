const Board = require("../models/Board");

const getBoardRole = (board, userId) => {
  const normalizedUserId = userId.toString();
  const ownerId = board.owner?._id ?? board.owner;
  if (ownerId.toString() === normalizedUserId) {
    return "owner";
  }

  const participantRole = board.participantRoles?.find(
    entry => (entry.user?._id ?? entry.user).toString() === normalizedUserId
  )?.role;

  if (participantRole) {
    return participantRole;
  }

  // Participants added before roles were introduced retain their existing edit access.
  return "editor";
};

const findAccessibleBoard = (boardId, userId) => Board.findOne({
  _id: boardId,
  $or: [
    { owner: userId },
    { participants: userId }
  ]
});

const canEditBoard = (board, userId) =>
  ["owner", "editor"].includes(getBoardRole(board, userId));

module.exports = { canEditBoard, findAccessibleBoard, getBoardRole };
