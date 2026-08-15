const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { assertMember, createMessage, editMessage, deleteMessage } = require("../services/messageService");
const { notifyNewMessage } = require("../services/pushService");

// État en mémoire des appels de groupe actifs : conversationId -> Map(userId -> { name, avatarUrl })
// Limite connue : ceci ne fonctionne que pour une seule instance de serveur.
// Pour scaler horizontalement (plusieurs instances Node), il faudrait déplacer
// cet état vers Redis (partagé entre instances via pub/sub, comme la présence).
const activeGroupCalls = new Map();

function getOrCreateCallRoom(conversationId) {
  if (!activeGroupCalls.has(conversationId)) {
    activeGroupCalls.set(conversationId, new Map());
  }
  return activeGroupCalls.get(conversationId);
}

module.exports = function (io) {
  // Middleware d'authentification pour les sockets :
  // le client doit envoyer son access token à la connexion
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Token manquant"));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("Utilisateur introuvable"));

      socket.userId = String(user._id);
      next();
    } catch (err) {
      next(new Error("Authentification socket échouée"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`Utilisateur connecté : ${socket.userId}`);

    // Chaque utilisateur rejoint une "room" à son propre id
    // → permet de lui envoyer des événements ciblés facilement plus tard
    socket.join(socket.userId);

    await User.findByIdAndUpdate(socket.userId, { status: "online" });
    socket.broadcast.emit("user:status", {
      userId: socket.userId,
      status: "online",
    });

    socket.on("disconnect", async () => {
      console.log(`Utilisateur déconnecté : ${socket.userId}`);
      await User.findByIdAndUpdate(socket.userId, {
        status: "offline",
        lastSeen: new Date(),
      });
      socket.broadcast.emit("user:status", {
        userId: socket.userId,
        status: "offline",
      });

      // Retire l'utilisateur de tout appel de groupe actif auquel il participait
      // (déconnexion brutale : onglet fermé, perte réseau, etc.)
      activeGroupCalls.forEach((room, conversationId) => {
        if (room.has(socket.userId)) {
          room.delete(socket.userId);
          if (room.size === 0) activeGroupCalls.delete(conversationId);
          socket.to(conversationId).emit("call:group:participant-left", {
            conversationId,
            userId: socket.userId,
          });
        }
      });
    });

    // ─── Rejoindre les rooms de ses conversations ───
    // Permet de recevoir les messages sans avoir à "join" manuellement à chaque fois
    try {
      const conversations = await Conversation.find({
        "members.user": socket.userId,
      }).select("_id");
      conversations.forEach((c) => socket.join(String(c._id)));
    } catch (err) {
      console.error("Erreur en rejoignant les conversations :", err.message);
    }

    // ─── Envoi d'un message ───
    // payload attendu : { conversationId, type, content, media, replyTo, tempId }
    // tempId : identifiant temporaire généré côté client pour faire le lien
    // avec le message optimiste affiché avant confirmation serveur
    socket.on("message:send", async (payload, callback) => {
      try {
        const { conversationId, type, content, media, replyTo, tempId } = payload;

        const { message, conversation } = await createMessage({
          conversationId,
          senderId: socket.userId,
          type,
          content,
          media,
          replyTo,
        });

        // Diffuse le message à tous les membres connectés de la conversation
        io.to(conversationId).emit("message:new", { message, tempId });

        // Notifie par push uniquement les membres qui ne sont pas connectés en temps réel
        // (ceux déjà dans la room ont reçu l'événement ci-dessus, pas besoin de les spammer)
        const roomSockets = await io.in(conversationId).fetchSockets();
        const onlineUserIds = new Set(roomSockets.map((s) => s.userId));
        const offlineMembers = conversation.members.filter(
          (m) => !onlineUserIds.has(String(m.user._id || m.user))
        );
        if (offlineMembers.length > 0) {
          notifyNewMessage({
            conversation: { ...conversation.toObject(), members: offlineMembers },
            message,
          }).catch((err) => console.error("Erreur notification push :", err.message));
        }

        // Confirme au sender que l'envoi a réussi (accusé d'émission)
        if (typeof callback === "function") {
          callback({ success: true, message, tempId });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, message: err.message });
        }
      }
    });

    // ─── Indicateur "en train d'écrire" ───
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:start", {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:stop", {
        conversationId,
        userId: socket.userId,
      });
    });

    // ─── Accusé de réception (message livré au destinataire) ───
    socket.on("message:delivered", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadyDelivered = message.deliveredTo.some(
          (d) => String(d.user) === socket.userId
        );
        if (!alreadyDelivered) {
          message.deliveredTo.push({ user: socket.userId });
          await message.save();
        }

        io.to(String(message.conversation)).emit("message:delivered", {
          messageId,
          userId: socket.userId,
        });
      } catch (err) {
        console.error("Erreur message:delivered :", err.message);
      }
    });

    // ─── Accusé de lecture ───
    socket.on("message:read", async ({ conversationId, messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadyRead = message.readBy.some(
          (r) => String(r.user) === socket.userId
        );
        if (!alreadyRead) {
          message.readBy.push({ user: socket.userId });
          await message.save();
        }

        io.to(conversationId).emit("message:read", {
          messageId,
          userId: socket.userId,
        });
      } catch (err) {
        console.error("Erreur message:read :", err.message);
      }
    });

    // ─── Réaction à un message ───
    socket.on("message:react", async ({ messageId, emoji }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Un seul emoji par utilisateur : on remplace s'il existe déjà
        message.reactions = message.reactions.filter(
          (r) => String(r.user) !== socket.userId
        );
        if (emoji) {
          message.reactions.push({ user: socket.userId, emoji });
        }
        await message.save();

        io.to(String(message.conversation)).emit("message:react", {
          messageId,
          userId: socket.userId,
          emoji,
        });
      } catch (err) {
        console.error("Erreur message:react :", err.message);
      }
    });

    // ─── Modifier un message texte ───
    socket.on("message:edit", async ({ messageId, content }, callback) => {
      try {
        const message = await editMessage({ messageId, userId: socket.userId, content });
        io.to(String(message.conversation)).emit("message:edit", { message });
        if (typeof callback === "function") callback({ success: true, message });
      } catch (err) {
        if (typeof callback === "function") callback({ success: false, message: err.message });
      }
    });

    // ─── Supprimer un message (suppression douce) ───
    socket.on("message:delete", async ({ messageId }, callback) => {
      try {
        const message = await deleteMessage({ messageId, userId: socket.userId });
        io.to(String(message.conversation)).emit("message:delete", {
          messageId: String(message._id),
          conversationId: String(message.conversation),
        });
        if (typeof callback === "function") callback({ success: true });
      } catch (err) {
        if (typeof callback === "function") callback({ success: false, message: err.message });
      }
    });

    // ─── Rejoindre une nouvelle conversation (ex : juste créée) ───
    socket.on("conversation:join", async ({ conversationId }) => {
      try {
        await assertMember(conversationId, socket.userId);
        socket.join(conversationId);
      } catch (err) {
        console.error("Erreur conversation:join :", err.message);
      }
    });

    // ─── Signalisation WebRTC pour les appels audio/vidéo 1-à-1 ───
    // Le serveur ne fait que relayer les messages entre les deux pairs ;
    // toute la logique média (offre/réponse SDP, candidats ICE) reste côté client.

    // Initie un appel : envoie l'offre SDP au destinataire
    socket.on("call:invite", ({ toUserId, conversationId, offer, callType, fromName, fromAvatar }) => {
      io.to(toUserId).emit("call:incoming", {
        fromUserId: socket.userId,
        fromName,
        fromAvatar,
        conversationId,
        offer,
        callType, // "audio" | "video"
      });
    });

    // Le destinataire répond avec sa propre offre SDP (answer)
    socket.on("call:answer", ({ toUserId, answer }) => {
      io.to(toUserId).emit("call:answered", { fromUserId: socket.userId, answer });
    });

    // Échange des candidats ICE (négociation de la connexion directe)
    socket.on("call:ice-candidate", ({ toUserId, candidate }) => {
      io.to(toUserId).emit("call:ice-candidate", { fromUserId: socket.userId, candidate });
    });

    // Le destinataire refuse l'appel
    socket.on("call:reject", ({ toUserId }) => {
      io.to(toUserId).emit("call:rejected", { fromUserId: socket.userId });
    });

    // Fin d'appel (raccroché par l'un ou l'autre)
    socket.on("call:end", ({ toUserId }) => {
      io.to(toUserId).emit("call:ended", { fromUserId: socket.userId });
    });

    // ─── Signalisation WebRTC pour les appels de groupe (mesh) ───
    // Chaque participant se connecte directement à tous les autres.
    // Le serveur ne fait que : suivre qui est dans l'appel, et relayer
    // la négociation (offres/réponses/candidats ICE) entre paires ciblées.

    // Démarre ou annonce un appel de groupe à tous les membres de la conversation
    socket.on("call:group:start", ({ conversationId, callType, fromName, fromAvatar }) => {
      const room = getOrCreateCallRoom(conversationId);
      room.set(socket.userId, { name: fromName, avatarUrl: fromAvatar });

      socket.to(conversationId).emit("call:group:incoming", {
        conversationId,
        callType,
        fromUserId: socket.userId,
        fromName,
        fromAvatar,
      });
    });

    // Un participant rejoint l'appel : reçoit la liste des participants déjà présents,
    // et chacun d'eux est notifié de son arrivée pour initier la connexion mesh
    socket.on("call:group:join", ({ conversationId, name, avatarUrl }, callback) => {
      const room = getOrCreateCallRoom(conversationId);
      const existingParticipants = Array.from(room.entries()).map(([userId, info]) => ({
        userId,
        ...info,
      }));

      room.set(socket.userId, { name, avatarUrl });

      // Répond au nouvel arrivant avec la liste de ceux déjà présents
      if (typeof callback === "function") {
        callback({ participants: existingParticipants });
      }

      // Informe les participants déjà présents qu'un nouveau vient d'arriver
      socket.to(conversationId).emit("call:group:participant-joined", {
        conversationId,
        userId: socket.userId,
        name,
        avatarUrl,
      });
    });

    // Négociation mesh ciblée entre deux participants précis de l'appel de groupe
    socket.on("call:group:offer", ({ toUserId, conversationId, offer }) => {
      io.to(toUserId).emit("call:group:offer", { fromUserId: socket.userId, conversationId, offer });
    });
    socket.on("call:group:answer", ({ toUserId, conversationId, answer }) => {
      io.to(toUserId).emit("call:group:answer", { fromUserId: socket.userId, conversationId, answer });
    });
    socket.on("call:group:ice-candidate", ({ toUserId, conversationId, candidate }) => {
      io.to(toUserId).emit("call:group:ice-candidate", { fromUserId: socket.userId, conversationId, candidate });
    });

    // Quitte l'appel de groupe (raccroche, sans quitter la conversation elle-même)
    socket.on("call:group:leave", ({ conversationId }) => {
      const room = activeGroupCalls.get(conversationId);
      if (room) {
        room.delete(socket.userId);
        if (room.size === 0) activeGroupCalls.delete(conversationId);
      }
      socket.to(conversationId).emit("call:group:participant-left", {
        conversationId,
        userId: socket.userId,
      });
    });
  });
};
