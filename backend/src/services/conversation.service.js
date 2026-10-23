
const Conversation = require("../models/Conversation");

const MAX_MESSAGES = 10;

async function getConversationContext(boardId, userId) {
  let conversation = await Conversation.findOne({
    boardId,
    userId
  });

  if (!conversation) {
    conversation = await Conversation.create({
      boardId,
      userId,
      messages: []
    });
  }

  return conversation;
}

async function saveMessage(boardId, userId, role, content) {
  const conversation = await getConversationContext(
    boardId,
    userId
  );

  conversation.messages.push({ role, content });

  // Keep only the latest 10 messages
  conversation.messages = conversation.messages.slice(
    -MAX_MESSAGES
  );

  await conversation.save();

  return conversation;
}

async function getRecentMessages(boardId, userId) {
  const conversation = await getConversationContext(
    boardId,
    userId
  );

  return conversation.messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

module.exports = {
  getConversationContext,
  saveMessage,
  getRecentMessages
};
