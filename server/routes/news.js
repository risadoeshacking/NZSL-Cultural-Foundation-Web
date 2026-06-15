const express = require("express");
const router = express.Router();
const {
  getNews,
  getArticle,
  getAllNews,
  createArticle,
  updateArticle,
  deleteArticle,
} = require("../controllers/newsController");
const { authenticate } = require("../middleware/auth");

// Public routes
router.get("/", getNews);
router.get("/:id", getArticle);

// Admin routes
router.get("/admin/all", authenticate, getAllNews);
router.post("/admin", authenticate, createArticle);
router.put("/admin/:id", authenticate, updateArticle);
router.delete("/admin/:id", authenticate, deleteArticle);

module.exports = router;
