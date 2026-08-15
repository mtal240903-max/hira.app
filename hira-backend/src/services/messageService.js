const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Vérifie que l'utilisateur appartient bien à la conversation
async function assertMember(conversationId, userId) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    "members.user": userId,
  });
  if (!conversation) {
    throw new Error("Conversation introuvable ou accès refusé");
  }
  return conversation;
}

// Crée un message et met à jour la conversation (lastMessage, lastMessageAt)
async function createMessage({ conversationId, senderId, type, content, media, replyTo }) {
  const conversation = await assertMember(conversationId, senderId);

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    type: type || "text",
    content: content || "",
    media: media || undefined,
    replyTo: replyTo || null,
    deliveredTo: [{ user: senderId }],
    readBy: [{ user: senderId }],
  });

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  await message.populate("sender", "name avatarUrl");
  if (replyTo) await message.populate("replyTo");

  return { message, conversation };
}

// Modifie le contenu d'un message texte (seul l'auteur peut le faire)
async function editMessage({ messageId, userId, content }) {
  const message = await Message.findById(messageId);
  if (!message || message.isDeleted) {
    throw new Error("Message introuvable");
  }
  if (String(message.sender) !== String(userId)) {
    throw new Error("Seul l'auteur peut modifier ce message");
  }
  if (message.type !== "text") {
    throw new Error("Seuls les messages texte peuvent être modifiés");
  }

  message.content = content;
  message.isEdited = true;
  await message.save();
  await message.populate("sender", "name avatarUrl");

  return message;
}

// Suppression douce : le contenu est effacé mais le message reste
// visible comme "message supprimé" pour préserver le fil de la conversation
async function deleteMessage({ messageId, userId }) {
  const message = await Message.findById(messageId);
  if (!message || message.isDeleted) {
    throw new Error("Message introuvable");
  }
  if (String(message.sender) !== String(userId)) {
    throw new Error("Seul l'auteur peut supprimer ce message");
  }

  message.isDeleted = true;
  message.content = "";
  message.media = undefined;
  await message.save();

  return message;
}

module.exports = { assertMember, createMessage, editMessage, deleteMessage };
