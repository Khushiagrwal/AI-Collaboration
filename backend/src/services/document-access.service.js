const Board = require("../models/Board");
const Document = require("../models/Document");

const findAccessibleBoard = (boardId, userId) => Board.findOne({
  _id: boardId,
  $or: [
    { owner: userId },
    { participants: userId }
  ]
});

const findAccessibleDocument = async (documentId, userId) => {
  const document = await Document.findOne({ documentId });
  if (!document) {
    return null;
  }

  const board = await findAccessibleBoard(document.board, userId);
  return board ? document : null;
};

module.exports = { findAccessibleBoard, findAccessibleDocument };
