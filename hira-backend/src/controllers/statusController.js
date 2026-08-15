const Status = require("../models/Status");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middlewares/errorHandler");

// @route  POST /api/status
// @desc   Publie un nouveau statut (texte ou média)
const createStatus = asyncHandler(async (req, res) => {
  const { type, content, backgroundColor, media } = req.body;

  if (!type || !["text", "image", "video"].includes(type)) {
    throw new AppError("Type de statut invalide (text, image ou video)", 400);
  }
  if (type === "text" && !content?.trim()) {
    throw new AppError("Contenu requis pour un statut texte", 400);
  }
  if (type !== "text" && !media?.url) {
    throw new AppError("Média requis pour ce type de statut", 400);
  }

  const status = await Status.create({
    user: req.user._id,
    type,
    content: content || "",
    backgroundColor: backgroundColor || "#3B82F6",
    media: type !== "text" ? media : undefined,
  });

  await status.populate("user", "name avatarUrl");

  // Diffuse aux contacts connectés que ce user a un nouveau statut
  const io = req.app.get("io");
  req.user.contacts.forEach((contactId) => {
    io.to(String(contactId)).emit("status:new", { status });
  });

  res.status(201).json({ success: true, status });
});

// @route  GET /api/status
// @desc   Liste les statuts actifs des contacts (+ les miens), groupés par utilisateur
const getStatuses = asyncHandler(async (req, res) => {
  const user = await req.user.populate("contacts");
  const userIds = [req.user._id, ...user.contacts.map((c) => c._id)];

  const statuses = await Status.find({ user: { $in: userIds } })
    .sort({ createdAt: 1 })
    .populate("user", "name avatarUrl")
    .populate("viewers.user", "name avatarUrl");

  // Regroupe par auteur pour que le client affiche un cercle par personne,
  // avec la liste ordonnée de ses statuts à l'intérieur
  const grouped = {};
  statuses.forEach((s) => {
    const key = String(s.user._id);
    if (!grouped[key]) grouped[key] = { user: s.user, statuses: [] };
    grouped[key].statuses.push(s);
  });

  res.status(200).json({ success: true, groups: Object.values(grouped) });
});

// @route  POST /api/status/:id/view
// @desc   Marque un statut comme vu par l'utilisateur courant
const viewStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const status = await Status.findById(id);
  if (!status) throw new AppError("Statut introuvable ou expiré", 404);

  const alreadyViewed = status.viewers.some((v) => String(v.user) === String(req.user._id));
  if (!alreadyViewed && String(status.user) !== String(req.user._id)) {
    status.viewers.push({ user: req.user._id });
    await status.save();

    // Notifie l'auteur en temps réel qu'un contact a vu son statut
    const io = req.app.get("io");
    io.to(String(status.user)).emit("status:viewed", {
      statusId: status._id,
      viewer: { id: req.user._id, name: req.user.name, avatarUrl: req.user.avatarUrl },
    });
  }

  res.status(200).json({ success: true });
});

// @route  DELETE /api/status/:id
// @desc   Supprime son propre statut avant son expiration naturelle
const deleteStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const status = await Status.findById(id);
  if (!status) throw new AppError("Statut introuvable", 404);
  if (String(status.user) !== String(req.user._id)) {
    throw new AppError("Tu ne peux supprimer que tes propres statuts", 403);
  }

  await status.deleteOne();
  res.status(200).json({ success: true, message: "Statut supprimé" });
});

module.exports = { createStatus, getStatuses, viewStatus, deleteStatus };
