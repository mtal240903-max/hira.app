const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video"],
      required: true,
    },
    // Pour un statut texte : le texte lui-même. Pour un média : légende optionnelle.
    content: {
      type: String,
      default: "",
      maxlength: 500,
    },
    // Couleur de fond pour un statut texte (ex: "#3B82F6")
    backgroundColor: {
      type: String,
      default: "#3B82F6",
    },
    media: {
      url: String,
      key: String,
      mimeType: String,
    },
    viewers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    // Expire 24h après création — MongoDB supprime automatiquement le document
    // dès que expireAfterSeconds est dépassé (index TTL, voir ci-dessous)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Index TTL : MongoDB supprime automatiquement le document une fois expiresAt atteint
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Accélère "tous les statuts actifs d'un utilisateur, du plus récent au plus ancien"
statusSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Status", statusSchema);
