const express = require("express");
const router = express.Router();
const {
  getEvents,
  getEvent,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventsController");
const { authenticate } = require("../middleware/auth");

// Public routes
router.get("/", getEvents);
router.get("/:id", getEvent);

// Admin routes
router.get("/admin/all", authenticate, getAllEvents);
router.post("/admin", authenticate, createEvent);
router.put("/admin/:id", authenticate, updateEvent);
router.delete("/admin/:id", authenticate, deleteEvent);

module.exports = router;
