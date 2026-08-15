// Erreur personnalisée pour les cas métier (404, 400, 401, etc.)
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function notFound(req, res, next) {
  next(new AppError(`Route non trouvée : ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Erreur serveur";

  // Erreurs Mongoose : validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Erreurs Mongoose : clé dupliquée (email/téléphone déjà utilisé)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Ce ${field} est déjà utilisé`;
  }

  // Erreurs Mongoose : ObjectId invalide
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Identifiant invalide : ${err.value}`;
  }

  // Erreurs Multer (upload de fichiers)
  if (err.name === "MulterError") {
    statusCode = 413;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Fichier trop volumineux";
    } else {
      message = `Erreur d'upload : ${err.message}`;
    }
  }
  // Erreur levée par notre fileFilter (type non autorisé)
  if (err.message && err.message.startsWith("Type de fichier non autorisé")) {
    statusCode = 415;
    message = err.message;
  }

  // Erreurs JWT
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token invalide";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expiré";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = { AppError, notFound, errorHandler };
