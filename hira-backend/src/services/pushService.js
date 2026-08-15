const { admin, isFirebaseReady } = require("../config/firebase");
const User = require("../models/User");

// Envoie une notification push à un utilisateur, sur tous ses appareils enregistrés.
// Retire automatiquement les tokens devenus invalides (app désinstallée, token expiré...).
async function sendPushToUser(userId, { title, body, data = {} }) {
  if (!isFirebaseReady()) return; // silencieux si Firebase n'est pas configuré (dev sans clé)

  const user = await User.findById(userId).select("pushTokens");
  if (!user || user.pushTokens.length === 0) return;

  const tokens = user.pushTokens.map((t) => t.token);

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      // FCM exige des valeurs string dans "data"
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Repère les tokens qui ont échoué de façon définitive et les retire
  const invalidTokens = [];
  response.responses.forEach((res, i) => {
    if (!res.success) {
      const code = res.error?.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        invalidTokens.push(tokens[i]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    await User.updateOne(
      { _id: userId },
      { $pull: { pushTokens: { token: { $in: invalidTokens } } } }
    );
  }
}

// Notifie tous les membres d'une conversation sauf l'expéditeur du message
// (utilisé quand un membre n'est pas connecté en socket pour recevoir le message en temps réel)
async function notifyNewMessage({ conversation, message }) {
  const recipientIds = conversation.members
    .map((m) => String(m.user._id || m.user))
    .filter((id) => id !== String(message.sender._id || message.sender));

  const senderName = message.sender.name || "Quelqu'un";
  const preview =
    message.type === "text"
      ? message.content.slice(0, 100)
      : `a envoyé un(e) ${message.type}`;

  await Promise.all(
    recipientIds.map((id) =>
      sendPushToUser(id, {
        title: senderName,
        body: preview,
        data: {
          type: "new_message",
          conversationId: String(conversation._id),
          messageId: String(message._id),
        },
      }).catch((err) =>
        console.error(`Push échoué pour ${id} :`, err.message)
      )
    )
  );
}

module.exports = { sendPushToUser, notifyNewMessage };
