const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["private", "group"],
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    // Uniquement pour les groupes
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    // Référence rapide au dernier message, pour afficher la liste des conversations sans requête lourde
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Accélère la recherche "toutes les conversations d'un utilisateur, triées par activité"
conversationSchema.index({ "members.user": 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
