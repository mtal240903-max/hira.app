const admin = require("firebase-admin");

let initialized = false;

// Initialise Firebase Admin une seule fois, à partir des credentials du compte de service.
// FIREBASE_SERVICE_ACCOUNT contient le JSON du compte de service, encodé en base64
// (évite d'avoir un fichier .json séparé à gérer/committer).
function initFirebase() {
  if (initialized) return;

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!encoded) {
    console.warn("FIREBASE_SERVICE_ACCOUNT non défini, notifications push désactivées");
    return;
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(encoded, "base64").toString("utf-8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
    console.log("Firebase Admin initialisé");
  } catch (err) {
    console.error("Erreur d'initialisation Firebase :", err.message);
  }
}

function isFirebaseReady() {
  return initialized;
}

module.exports = { admin, initFirebase, isFirebaseReady };
