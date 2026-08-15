const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const s3Client = require("../config/s3");

const BUCKET = process.env.S3_BUCKET;

// Construit une clé de fichier organisée : category/YYYY-MM/uuid.ext
function buildKey(category, originalName) {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
  const yearMonth = new Date().toISOString().slice(0, 7); // ex: 2026-08
  const uniqueName = uuidv4();
  return `${category}/${yearMonth}/${uniqueName}${ext ? "." + ext : ""}`;
}

// Envoie un buffer vers S3/MinIO et renvoie les infos utiles au modèle Message
async function uploadBuffer({ buffer, mimeType, originalName, category }) {
  const key = buildKey(category, originalName);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return {
    key,
    url: buildPublicUrl(key),
    fileName: originalName,
    mimeType,
    size: buffer.length,
  };
}

// URL publique directe (fonctionne si le bucket/l'objet est public,
// ou si le service est exposé derrière un CDN/proxy public)
function buildPublicUrl(key) {
  const base = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT;
  return `${base}/${BUCKET}/${key}`;
}

// URL signée temporaire — à utiliser si le bucket est privé (recommandé pour Hira,
// vu que les médias de conversations privées ne doivent pas être publiquement accessibles)
async function getSignedFileUrl(key, expiresInSeconds = 3600) {
  const { GetObjectCommand } = require("@aws-sdk/client-s3");
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

async function deleteFile(key) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadBuffer, buildPublicUrl, getSignedFileUrl, deleteFile };
