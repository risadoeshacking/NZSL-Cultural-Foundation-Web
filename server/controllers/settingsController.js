const pool = require("../db/pool");

// Public: Get all settings
const getSettings = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM settings ORDER BY category, key"
    );
    res.json({ settings: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Get all settings
const getAllSettings = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM settings ORDER BY category, key"
    );
    res.json({ settings: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Update settings (bulk)
const updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: "Settings array is required" });
    }

    for (const { key, value, category } of settings) {
      await pool.query(
        `INSERT INTO settings (key, value, category) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value, category || "general"]
      );
    }

    const result = await pool.query(
      "SELECT * FROM settings ORDER BY category, key"
    );
    res.json({ settings: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  getAllSettings,
  updateSettings,
};
