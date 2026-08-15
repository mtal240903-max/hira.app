const { HeadBucketCommand, CreateBucketCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3");

// Vérifie si le bucket existe, le crée sinon.
// Appelé au démarrage du serveur pour éviter les erreurs "bucket introuvable"
// lors du tout premier upload, notamment en développement avec MinIO.
async function ensureBucketExists() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    console.warn("S3_BUCKET non défini, upload média désactivé");
    return;
  }

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket S3 "${bucket}" déjà présent`);
  } catch (err) {
    // Le bucket n'existe pas encore (ou erreur d'accès) → on tente de le créer
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`Bucket S3 "${bucket}" créé`);
    } catch (createErr) {
      console.error(
        `Impossible de créer/vérifier le bucket "${bucket}" : ${createErr.message}`
      );
    }
  }
}

module.exports = ensureBucketExists;
