const axios = require("axios");
const { AppError } = require("../middlewares/errorHandler");

const WUROEN_API_URL = process.env.WUROEN_API_URL;
const WUROEN_ME_ENDPOINT = process.env.WUROEN_ME_ENDPOINT || "/api/auth/me";

// Appelle l'API Wuro'en avec le token fourni par le client, pour vérifier
// qu'il est valide et récupérer l'identité de l'utilisateur.
//
// ⚠️ Mapping des champs à ajuster selon la vraie forme de la réponse Wuro'en.
// Ici on suppose une réponse du type { user: { id, name, email } } ou
// directement { id, name, email } — les deux formes courantes sont gérées.
async function verifyWuroenToken(wuroenToken) {
  if (!WUROEN_API_URL) {
    throw new AppError("Intégration Wuro'en non configurée (WUROEN_API_URL manquant)", 500);
  }

  let response;
  try {
    response = await axios.get(`${WUROEN_API_URL}${WUROEN_ME_ENDPOINT}`, {
      headers: { Authorization: `Bearer ${wuroenToken}` },
      timeout: 5000,
    });
  } catch (err) {
    if (err.response?.status === 401) {
      throw new AppError("Token Wuro'en invalide ou expiré", 401);
    }
    throw new AppError(`Impossible de joindre Wuro'en : ${err.message}`, 502);
  }

  // Gère les deux formes de réponse les plus courantes, et _id (Mongoose) en plus de id
  const data = response.data.user || response.data;
  const rawId = data?._id || data?.id;

  if (!rawId) {
    throw new AppError("Réponse Wuro'en inattendue (id utilisateur manquant)", 502);
  }

  return {
    wuroenId: String(rawId),
    name: data.name || data.fullName || "Utilisateur Wuro'en",
    email: data.email || undefined,
  };
}

module.exports = { verifyWuroenToken };
