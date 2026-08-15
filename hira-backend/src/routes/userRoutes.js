const express = require("express");
const {
  getMe,
  updateMe,
  searchUsers,
  addContact,
  getContacts,
  registerPushToken,
  unregisterPushToken,
} = require("../controllers/userController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// Toutes les routes ci-dessous nécessitent d'être connecté
router.use(protect);

router.get("/me", getMe);
router.put("/me", updateMe);
router.get("/search", searchUsers);
router.get("/contacts", getContacts);
router.post("/contacts/:id", addContact);
router.post("/push-token", registerPushToken);
router.delete("/push-token", unregisterPushToken);

module.exports = router;
