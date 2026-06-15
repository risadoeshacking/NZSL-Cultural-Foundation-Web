const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { authenticate } = require("../middleware/auth");

router.get("/stats", authenticate, async (req, res, next) => {
  try {
    const [
      eventsCount,
      newsCount,
      galleryCount,
      storiesCount,
      recentEvents,
      recentNews,
      recentGallery,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM events"),
      pool.query("SELECT COUNT(*) FROM news"),
      pool.query("SELECT COUNT(*) FROM gallery"),
      pool.query("SELECT COUNT(*) FROM stories"),
      pool.query(
        "SELECT id, title, date, category, cover_image FROM events ORDER BY created_at DESC LIMIT 5"
      ),
      pool.query(
        "SELECT id, title, created_at, category, thumbnail FROM news ORDER BY created_at DESC LIMIT 5"
      ),
      pool.query(
        "SELECT id, title, image_url, category FROM gallery ORDER BY created_at DESC LIMIT 5"
      ),
    ]);

    res.json({
      stats: {
        totalEvents: parseInt(eventsCount.rows[0].count),
        totalNews: parseInt(newsCount.rows[0].count),
        totalGallery: parseInt(galleryCount.rows[0].count),
        totalStories: parseInt(storiesCount.rows[0].count),
      },
      recent: {
        events: recentEvents.rows,
        news: recentNews.rows,
        gallery: recentGallery.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
