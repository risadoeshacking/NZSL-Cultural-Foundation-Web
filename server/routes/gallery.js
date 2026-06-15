const express = require("express");
const router = express.Router();
const {
  getGallery,
  getAllGallery,
  uploadImage,
  updateImage,
  deleteImage,
} = require("../controllers/galleryController");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Public routes
router.get("/", getGallery);

// Admin routes
router.get("/admin/all", authenticate, getAllGallery);
router.post(
  "/admin/upload",
  authenticate,
  (req, res, next) => {
    req.uploadFolder = "gallery";
    next();
  },
  upload.single("image"),
  uploadImage
);
router.put("/admin/:id", authenticate, updateImage);
router.delete("/admin/:id", authenticate, deleteImage);

module.exports = router;
