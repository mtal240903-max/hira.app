const express = require("express");
const { uploadMedia, getSignedUrl } = require("../controllers/mediaController");
const upload = require("../middlewares/upload");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.use(protect);

router.post("/upload", upload.single("file"), uploadMedia);
router.get("/signed-url", getSignedUrl);

module.exports = router;
