const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("./errorHandler");
const User = require("../models/User");

// Protège une route : vérifie le token et attache l'utilisateur à req.user
const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw new AppError("Non autorisé, token manquant", 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError("Utilisateur introuvable", 401);
  }

  req.user = user;
  next();
});

module.exports = { protect };
