const { MEDIA_RULES, getCategoryFromMime } = require("../config/mediaRules");
const { uploadBuffer, getSignedFileUrl } = require("../services/s3Service");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middlewares/errorHandler");

// @route  POST /api/media/upload
// @desc   Upload un fichier (image, vidéo, audio, document) vers S3/MinIO
// @body   multipart/form-data avec le champ "file"
const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Aucun fichier reçu", 400);
  }

  const { buffer, mimetype, originalname, size } = req.file;
  const category = getCategoryFromMime(mimetype);

  if (!category) {
    throw new AppError(`Type de fichier non autorisé : ${mimetype}`, 415);
  }

  // Vérification fine de la taille selon la catégorie réelle du fichier
  // (multer n'a appliqué que la limite globale la plus large)
  const rule = MEDIA_RULES[category];
  if (size > rule.maxSizeBytes) {
    const maxMB = Math.round(rule.maxSizeBytes / (1024 * 1024));
    throw new AppError(`Fichier trop volumineux pour un ${category} (max ${maxMB} Mo)`, 413);
  }

  const result = await uploadBuffer({
    buffer,
    mimeType: mimetype,
    originalName: originalname,
    category,
  });

  res.status(201).json({
    success: true,
    category,
    media: result, // { key, url, fileName, mimeType, size }
  });
});

// @route  GET /api/media/signed-url?key=...
// @desc   Génère une URL signée temporaire pour accéder à un fichier privé
const getSignedUrl = asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) throw new AppError("Paramètre 'key' requis", 400);

  const url = await getSignedFileUrl(key);
  res.status(200).json({ success: true, url, expiresIn: 3600 });
});

module.exports = { uploadMedia, getSignedUrl };
