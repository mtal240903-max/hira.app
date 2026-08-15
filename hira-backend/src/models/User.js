const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
      maxlength: 50,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // permet plusieurs documents sans téléphone
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    // Identifiant du compte Wuro'en lié, si connexion via l'écosystème MTAL
    wuroenId: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: function () {
        // Pas de mot de passe local requis pour un compte créé via Wuro'en
        return !this.wuroenId;
      },
      minlength: 6,
      select: false, // jamais renvoyé par défaut dans les requêtes
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 150,
      default: "",
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Tokens FCM des appareils de l'utilisateur (web, Android, iOS)
    // Un même utilisateur peut être connecté sur plusieurs appareils
    pushTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String, enum: ["web", "android", "ios"], default: "web" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Hash du mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Comparer un mot de passe en clair avec le hash stocké
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Version "publique" du user (sans données sensibles)
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    phone: this.phone,
    email: this.email,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    status: this.status,
    lastSeen: this.lastSeen,
  };
};

module.exports = mongoose.model("User", userSchema);
