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

// Liste des origines autorisées de base
const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(",").map(origin => origin.trim());

// Socket.IO : sécurisé avec les mêmes règles d'origines
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Autorise les requêtes sans origin, celles dans la liste, ou n'importe quel sous-domaine vercel.app
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error("Origine non autorisée par CORS (Socket.IO)"));
      }
    },
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