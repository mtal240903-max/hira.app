const { S3Client } = require("@aws-sdk/client-s3");

// forcePathStyle: true est nécessaire pour MinIO (et la plupart des S3-compatibles)
// En AWS S3 pur, on peut le laisser à true aussi, ça fonctionne dans les deux cas.
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT, // ex: http://localhost:9000 (MinIO) ou vide pour AWS
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

module.exports = s3Client;
