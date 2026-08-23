const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middlewares/errorHandler");
const { verifyWuroenToken } = require("../services/wuroenService");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");

// @route  POST /api/auth/register
// @desc   Créer un compte (email ou téléphone + mot de passe)
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !password || (!email && !phone)) {
    throw new AppError(
      "Nom, mot de passe et (email ou téléphone) sont requis",
      400
    );
  }

  // Correction : Construction dynamique des conditions pour éviter le bug du `null`
  const conditions = [];
  if (email) conditions.push({ email });
  if (phone) conditions.push({ phone });

  let existing = null;
  if (conditions.length > 0) {
    existing = await User.findOne({ $or: conditions });
  }

  if (existing) {
    throw new AppError("Un compte existe déjà avec cet email ou ce numéro", 409);
  }

  const user = await User.create({ name, email, phone, password });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push({ token: refreshToken });
  user.status = "online";
  await user.save();

  res.status(201).json({
    success: true,
    user: user.toPublicJSON(),
    accessToken,
    refreshToken,
  });
});

// @route  POST /api/auth/login
// @desc   Connexion avec email/téléphone + mot de passe
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body; // identifier = email ou téléphone

  if (!identifier || !password) {
    throw new AppError("Identifiant et mot de passe requis", 400);
  }

  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
  }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Identifiant ou mot de passe incorrect", 401);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push({ token: refreshToken });
  user.status = "online";
  await user.save();

  res.status(200).json({
    success: true,
    user: user.toPublicJSON(),
    accessToken,
    refreshToken,
  });
});

// @route  POST /api/auth/refresh
// @desc   Génère un nouveau access token à partir du refresh token
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError("Refresh token manquant", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Refresh token invalide ou expiré", 401);
  }

  const user = await User.findById(decoded.id);
  const tokenExists = user?.refreshTokens.some(
    (rt) => rt.token === refreshToken
  );

  if (!user || !tokenExists) {
    throw new AppError("Refresh token invalide", 401);
  }

  const newAccessToken = generateAccessToken(user._id);

  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

// @route  POST /api/auth/logout
// @desc   Invalide le refresh token côté serveur
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const user = req.user;

  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.token !== refreshToken
  );
  user.status = "offline";
  user.lastSeen = new Date();
  await user.save();

  res.status(200).json({ success: true, message: "Déconnecté" });
});

// @route  POST /api/auth/wuroen
// @desc   Connexion (ou création de compte) via un token Wuro'en existant
const loginWithWuroen = asyncHandler(async (req, res) => {
  const { wuroenToken } = req.body;
  if (!wuroenToken) {
    throw new AppError("wuroenToken requis", 400);
  }

  const profile = await verifyWuroenToken(wuroenToken);

  // Retrouve un compte déjà lié, ou en crée un nouveau à la volée
  let user = await User.findOne({ wuroenId: profile.wuroenId });

  if (!user) {
    // Si un compte Hira existe déjà avec cet email, on le lie plutôt que d'en créer un doublon
    if (profile.email) {
      user = await User.findOne({ email: profile.email });
    }

    if (user) {
      user.wuroenId = profile.wuroenId;
    } else {
      user = new User({
        name: profile.name,
        email: profile.email,
        wuroenId: profile.wuroenId,
      });
    }
    await user.save();
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push({ token: refreshToken });
  user.status = "online";
  await user.save();

  res.status(200).json({
    success: true,
    user: user.toPublicJSON(),
    accessToken,
    refreshToken,
  });
});

module.exports = { register, login, refresh, logout, loginWithWuroen };