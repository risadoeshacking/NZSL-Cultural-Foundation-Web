const express = require("express");
const router = express.Router();
const {
  getSettings,
  getAllSettings,
  updateSettings,
} = require("../controllers/settingsController");
const { authenticate } = require("../middleware/auth");

// Public routes
router.get("/", getSettings);

// Admin routes
router.get("/admin", authenticate, getAllSettings);
router.put("/admin", authenticate, updateSettings);

module.exports = router;
