const Document = require("../models/Document");
const { findAccessibleBoard } = require("./board-access.service");

const findAccessibleDocument = async (documentId, userId) => {
  const document = await Document.findOne({ documentId });
  if (!document) {
    return null;
  }

  const board = await findAccessibleBoard(document.board, userId);
  return board ? document : null;
};

module.exports = { findAccessibleBoard, findAccessibleDocument };
