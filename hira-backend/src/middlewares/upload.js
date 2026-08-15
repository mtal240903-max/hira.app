const multer = require("multer");
const { GLOBAL_MAX_SIZE_BYTES, getCategoryFromMime } = require("../config/mediaRules");

// On garde le fichier en mémoire (buffer) plutôt que sur disque :
// plus simple pour le renvoyer directement vers S3/MinIO sans fichier temporaire à nettoyer.
// Pour de très gros fichiers (vidéos longues), on pourrait passer à un stream disque + upload multipart.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const category = getCategoryFromMime(file.mimetype);
  if (!category) {
    return cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: GLOBAL_MAX_SIZE_BYTES },
});

module.exports = upload;
