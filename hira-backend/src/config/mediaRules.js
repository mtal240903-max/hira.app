// Catégories de médias supportées par Hira, avec leurs contraintes.
// Centraliser ici permet de garder middleware et service cohérents.
const MEDIA_RULES = {
  image: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeBytes: 10 * 1024 * 1024, // 10 Mo
  },
  video: {
    mimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
    maxSizeBytes: 100 * 1024 * 1024, // 100 Mo
  },
  audio: {
    mimeTypes: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/webm", "audio/wav"],
    maxSizeBytes: 20 * 1024 * 1024, // 20 Mo (messages vocaux)
  },
  document: {
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
    ],
    maxSizeBytes: 50 * 1024 * 1024, // 50 Mo
  },
};

// Trouve la catégorie ("image", "video"...) à partir d'un mimetype
function getCategoryFromMime(mimeType) {
  return Object.keys(MEDIA_RULES).find((cat) =>
    MEDIA_RULES[cat].mimeTypes.includes(mimeType)
  );
}

// La taille max globale acceptée par multer (la plus grande catégorie)
// Le contrôle fin par catégorie se fait ensuite dans le service.
const GLOBAL_MAX_SIZE_BYTES = Math.max(
  ...Object.values(MEDIA_RULES).map((r) => r.maxSizeBytes)
);

module.exports = { MEDIA_RULES, getCategoryFromMime, GLOBAL_MAX_SIZE_BYTES };
