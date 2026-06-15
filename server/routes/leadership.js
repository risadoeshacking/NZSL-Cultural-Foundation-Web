const express = require("express");
const router = express.Router();
const {
  getLeadership,
  getAllLeadership,
  createLeader,
  updateLeader,
  deleteLeader,
} = require("../controllers/leadershipController");
const { authenticate } = require("../middleware/auth");

// Public routes
router.get("/", getLeadership);

// Admin routes
router.get("/admin/all", authenticate, getAllLeadership);
router.post("/admin", authenticate, createLeader);
router.put("/admin/:id", authenticate, updateLeader);
router.delete("/admin/:id", authenticate, deleteLeader);

module.exports = router;
