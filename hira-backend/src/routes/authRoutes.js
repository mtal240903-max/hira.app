const express = require("express");
const { register, login, refresh, logout, loginWithWuroen } = require("../controllers/authController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/wuroen", loginWithWuroen);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);

module.exports = router;
