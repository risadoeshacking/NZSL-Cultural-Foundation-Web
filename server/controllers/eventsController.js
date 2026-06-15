const pool = require("../db/pool");
const xss = require("xss");

const sanitize = (str) => (str ? xss(str) : str);

// Public: Get all published events
const getEvents = async (req, res, next) => {
  try {
    const { category, featured, limit = 50, offset = 0 } = req.query;
    let query = "SELECT * FROM events WHERE status = $1";
    const params = ["published"];
    let paramIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    if (featured === "true") {
      query += " AND featured = true";
    }

    query += " ORDER BY date ASC";

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
      paramIndex++;
    }
    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset));
      paramIndex++;
    }

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM events WHERE status = $1",
      ["published"]
    );

    res.json({
      events: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

// Public: Get single event
const getEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM events WHERE id = $1 AND status = $2",
      [id, "published"]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ event: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Get all events
const getAllEvents = async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM events ORDER BY date DESC");
    res.json({ events: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Create event
const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      full_description,
      date,
      end_date,
      time_start,
      time_end,
      location,
      category,
      cover_image,
      featured,
      status,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Title and date are required" });
    }

    const result = await pool.query(
      `INSERT INTO events (title, description, full_description, date, end_date, time_start, time_end, location, category, cover_image, featured, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        sanitize(title),
        sanitize(description),
        sanitize(full_description),
        date,
        end_date || null,
        time_start || null,
        time_end || null,
        sanitize(location),
        category || "cultural",
        cover_image || null,
        featured || false,
        status || "published",
        req.admin.id,
      ]
    );

    res.status(201).json({ event: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Update event
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      full_description,
      date,
      end_date,
      time_start,
      time_end,
      location,
      category,
      cover_image,
      featured,
      status,
    } = req.body;

    const result = await pool.query(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        full_description = COALESCE($3, full_description),
        date = COALESCE($4, date),
        end_date = $5,
        time_start = $6,
        time_end = $7,
        location = COALESCE($8, location),
        category = COALESCE($9, category),
        cover_image = $10,
        featured = COALESCE($11, featured),
        status = COALESCE($12, status),
        updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [
        title ? sanitize(title) : null,
        description ? sanitize(description) : null,
        full_description ? sanitize(full_description) : null,
        date || null,
        end_date || null,
        time_start || null,
        time_end || null,
        location ? sanitize(location) : null,
        category || null,
        cover_image !== undefined ? cover_image : null,
        featured !== undefined ? featured : null,
        status || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ event: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Delete event
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM events WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEvents,
  getEvent,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
