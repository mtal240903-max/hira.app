const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middlewares/errorHandler");

// @route  GET /api/users/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toPublicJSON() });
});

// @route  PUT /api/users/me
// @desc   Met à jour le profil (nom, bio, avatar)
const updateMe = asyncHandler(async (req, res) => {
  const { name, bio, avatarUrl } = req.body;

  if (name) req.user.name = name;
  if (bio !== undefined) req.user.bio = bio;
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;

  await req.user.save();

  res.status(200).json({ success: true, user: req.user.toPublicJSON() });
});

// @route  GET /api/users/search?q=...
// @desc   Recherche un utilisateur par nom, email ou téléphone
const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    throw new AppError("Requête de recherche trop courte", 400);
  }

  const regex = new RegExp(q.trim(), "i");
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [{ name: regex }, { email: regex }, { phone: regex }],
  }).limit(20);

  res.status(200).json({
    success: true,
    users: users.map((u) => u.toPublicJSON()),
  });
});

// @route  POST /api/users/contacts/:id
// @desc   Ajoute un utilisateur à ses contacts
const addContact = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === String(req.user._id)) {
    throw new AppError("Impossible de s'ajouter soi-même", 400);
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new AppError("Utilisateur introuvable", 404);
  }

  if (req.user.contacts.includes(id)) {
    throw new AppError("Ce contact existe déjà", 409);
  }

  req.user.contacts.push(id);
  await req.user.save();

  res.status(200).json({ success: true, message: "Contact ajouté" });
});

// @route  GET /api/users/contacts
const getContacts = asyncHandler(async (req, res) => {
  const user = await req.user.populate("contacts");
  res.status(200).json({
    success: true,
    contacts: user.contacts.map((c) => c.toPublicJSON()),
  });
});

// @route  POST /api/users/push-token
// @desc   Enregistre le token FCM de l'appareil courant (appelé après login, à chaque démarrage app)
const registerPushToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;
  if (!token) throw new AppError("Token requis", 400);

  const alreadyExists = req.user.pushTokens.some((t) => t.token === token);
  if (!alreadyExists) {
    req.user.pushTokens.push({ token, platform: platform || "web" });
    await req.user.save();
  }

  res.status(200).json({ success: true, message: "Token enregistré" });
});

// @route  DELETE /api/users/push-token
// @desc   Retire le token (appelé à la déconnexion pour ne plus notifier cet appareil)
const unregisterPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError("Token requis", 400);

  req.user.pushTokens = req.user.pushTokens.filter((t) => t.token !== token);
  await req.user.save();

  res.status(200).json({ success: true, message: "Token retiré" });
});

module.exports = {
  getMe,
  updateMe,
  searchUsers,
  addContact,
  getContacts,
  registerPushToken,
  unregisterPushToken,
};
