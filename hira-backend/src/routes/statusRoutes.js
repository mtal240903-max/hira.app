const express = require("express");
const { createStatus, getStatuses, viewStatus, deleteStatus } = require("../controllers/statusController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.use(protect);

router.get("/", getStatuses);
router.post("/", createStatus);
router.post("/:id/view", viewStatus);
router.delete("/:id", deleteStatus);

module.exports = router;
