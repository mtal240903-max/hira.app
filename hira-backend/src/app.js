const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const statusRoutes = require("./routes/statusRoutes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();

// Sécurité de base : limite le nombre de requêtes par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: "Trop de requêtes, réessayez plus tard" },
});
app.use(limiter);

// CORS : autorise les origines définies dans .env et tous les sous-domaines Vercel (.vercel.app)
const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(",").map(origin => origin.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error("Origine non autorisée par CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Route de santé (utile pour vérifier que l'API tourne)
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Hira API en ligne" });
});

// Routes principales
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/status", statusRoutes);

// 404 + gestion d'erreurs (toujours en dernier)
app.use(notFound);
app.use(errorHandler);

module.exports = app;