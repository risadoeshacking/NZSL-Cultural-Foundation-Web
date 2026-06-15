const express = require("express");
const router = express.Router();
const {
  getStories,
  getStory,
  getAllStories,
  createStory,
  updateStory,
  deleteStory,
} = require("../controllers/storiesController");
const { authenticate } = require("../middleware/auth");

// Public routes
router.get("/", getStories);
router.get("/:id", getStory);

// Admin routes
router.get("/admin/all", authenticate, getAllStories);
router.post("/admin", authenticate, createStory);
router.put("/admin/:id", authenticate, updateStory);
router.delete("/admin/:id", authenticate, deleteStory);

module.exports = router;
