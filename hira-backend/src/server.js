require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const ensureBucketExists = require("./config/ensureBucket");
const { initFirebase } = require("./config/firebase");

const PORT = process.env.PORT || 5000;

// Serveur HTTP brut, nécessaire pour brancher Socket.IO sur Express
const server = http.createServer(app);

// Socket.IO : prêt pour la partie chat temps réel (Hira 1.0 - messagerie)
const io = new Server(server, {
  cors: {
    origin: (process.env.CLIENT_ORIGINS || "").split(","),
    credentials: true,
  },
});

// On rend `io` accessible partout dans l'app si besoin (ex: notifier depuis un controller)
app.set("io", io);

// La logique des sockets (connexion, messages, statuts) sera branchée ici
require("./sockets")(io);

async function start() {
  await connectDB();
  await ensureBucketExists();
  initFirebase();
  server.listen(PORT, () => {
    console.log(`Serveur Hira démarré sur le port ${PORT}`);
  });
}

start();
