const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middlewares/errorHandler");

// @route  POST /api/conversations/private
// @desc   Récupère la conversation privée existante avec un user, ou la crée
const getOrCreatePrivateConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const myId = String(req.user._id);

  if (!userId) throw new AppError("userId requis", 400);
  if (userId === myId) throw new AppError("Impossible de discuter avec soi-même", 400);

  let conversation = await Conversation.findOne({
    type: "private",
    "members.user": { $all: [myId, userId] },
    $expr: { $eq: [{ $size: "$members" }, 2] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      type: "private",
      members: [{ user: myId }, { user: userId }],
    });
  }

  await conversation.populate("members.user", "name avatarUrl status lastSeen");

  res.status(200).json({ success: true, conversation });
});

// @route  POST /api/conversations/group
// @desc   Crée une conversation de groupe
const createGroup = asyncHandler(async (req, res) => {
  const { name, memberIds } = req.body;
  const myId = String(req.user._id);

  if (!name || !Array.isArray(memberIds) || memberIds.length < 1) {
    throw new AppError("Nom du groupe et au moins un membre requis", 400);
  }

  const uniqueIds = [...new Set([myId, ...memberIds])];

  const conversation = await Conversation.create({
    type: "group",
    name,
    members: uniqueIds.map((id) => ({
      user: id,
      role: id === myId ? "admin" : "member",
    })),
  });

  await conversation.populate("members.user", "name avatarUrl status lastSeen");

  res.status(201).json({ success: true, conversation });
});

// @route  GET /api/conversations
// @desc   Liste toutes les conversations de l'utilisateur, triées par activité récente
const getMyConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    "members.user": req.user._id,
  })
    .sort({ lastMessageAt: -1 })
    .populate("members.user", "name avatarUrl status lastSeen")
    .populate("lastMessage");

  res.status(200).json({ success: true, conversations });
});

// @route  GET /api/conversations/:id/messages?before=<messageId>&limit=30
// @desc   Historique paginé des messages (pagination par curseur, du plus récent au plus ancien)
const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { before, limit = 30 } = req.query;

  const conversation = await Conversation.findOne({
    _id: id,
    "members.user": req.user._id,
  });
  if (!conversation) {
    throw new AppError("Conversation introuvable ou accès refusé", 404);
  }

  const query = { conversation: id, isDeleted: false };
  if (before) {
    if (!mongoose.Types.ObjectId.isValid(before)) {
      throw new AppError("Paramètre 'before' invalide", 400);
    }
    query._id = { $lt: before };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 100))
    .populate("sender", "name avatarUrl")
    .populate("replyTo");

  res.status(200).json({ success: true, messages: messages.reverse() });
});

// @route  PUT /api/conversations/:id
// @desc   Modifie le nom / avatar d'un groupe (admin uniquement)
const updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, avatarUrl } = req.body;

  const conversation = await Conversation.findOne({ _id: id, type: "group" });
  if (!conversation) throw new AppError("Groupe introuvable", 404);

  const myMembership = conversation.members.find((m) => String(m.user) === String(req.user._id));
  if (!myMembership) throw new AppError("Accès refusé", 403);
  if (myMembership.role !== "admin") throw new AppError("Seul un admin peut modifier le groupe", 403);

  if (name !== undefined) conversation.name = name;
  if (avatarUrl !== undefined) conversation.avatarUrl = avatarUrl;
  await conversation.save();
  await conversation.populate("members.user", "name avatarUrl status lastSeen");

  res.status(200).json({ success: true, conversation });
});

// @route  POST /api/conversations/:id/members
// @desc   Ajoute des membres à un groupe (admin uniquement)
const addGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberIds } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    throw new AppError("memberIds requis", 400);
  }

  const conversation = await Conversation.findOne({ _id: id, type: "group" });
  if (!conversation) throw new AppError("Groupe introuvable", 404);

  const myMembership = conversation.members.find((m) => String(m.user) === String(req.user._id));
  if (!myMembership) throw new AppError("Accès refusé", 403);
  if (myMembership.role !== "admin") throw new AppError("Seul un admin peut ajouter des membres", 403);

  const existingIds = new Set(conversation.members.map((m) => String(m.user)));
  const toAdd = memberIds.filter((id) => !existingIds.has(id));
  toAdd.forEach((userId) => conversation.members.push({ user: userId, role: "member" }));

  await conversation.save();
  await conversation.populate("members.user", "name avatarUrl status lastSeen");

  res.status(200).json({ success: true, conversation });
});

// @route  DELETE /api/conversations/:id/members/:userId
// @desc   Retire un membre du groupe (admin uniquement)
const removeGroupMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const conversation = await Conversation.findOne({ _id: id, type: "group" });
  if (!conversation) throw new AppError("Groupe introuvable", 404);

  const myMembership = conversation.members.find((m) => String(m.user) === String(req.user._id));
  if (!myMembership) throw new AppError("Accès refusé", 403);
  if (myMembership.role !== "admin") throw new AppError("Seul un admin peut retirer un membre", 403);

  conversation.members = conversation.members.filter((m) => String(m.user) !== userId);
  await conversation.save();
  await conversation.populate("members.user", "name avatarUrl status lastSeen");

  res.status(200).json({ success: true, conversation });
});

// @route  POST /api/conversations/:id/leave
// @desc   Quitte un groupe (tout membre peut le faire)
const leaveGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const myId = String(req.user._id);

  const conversation = await Conversation.findOne({ _id: id, type: "group" });
  if (!conversation) throw new AppError("Groupe introuvable", 404);

  const wasAdmin = conversation.members.find((m) => String(m.user) === myId)?.role === "admin";
  conversation.members = conversation.members.filter((m) => String(m.user) !== myId);

  // Si l'admin qui quitte était le seul admin, promouvoir le membre le plus ancien restant
  const stillHasAdmin = conversation.members.some((m) => m.role === "admin");
  if (wasAdmin && !stillHasAdmin && conversation.members.length > 0) {
    conversation.members[0].role = "admin";
  }

  await conversation.save();
  res.status(200).json({ success: true, message: "Groupe quitté" });
});

module.exports = {
  getOrCreatePrivateConversation,
  createGroup,
  getMyConversations,
  getMessages,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
};
