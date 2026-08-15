const express = require("express");
const {
  getOrCreatePrivateConversation,
  createGroup,
  getMyConversations,
  getMessages,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
} = require("../controllers/conversationController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.use(protect);

router.get("/", getMyConversations);
router.post("/private", getOrCreatePrivateConversation);
router.post("/group", createGroup);
router.get("/:id/messages", getMessages);
router.put("/:id", updateGroup);
router.post("/:id/members", addGroupMembers);
router.delete("/:id/members/:userId", removeGroupMember);
router.post("/:id/leave", leaveGroup);

module.exports = router;
