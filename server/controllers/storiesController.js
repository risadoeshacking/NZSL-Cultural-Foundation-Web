const pool = require("../db/pool");
const xss = require("xss");

const sanitize = (str) => (str ? xss(str) : str);

const getStories = async (req, res, next) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    let query = "SELECT * FROM stories WHERE status = $1";
    const params = ["published"];
    let paramIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += " ORDER BY created_at DESC";

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
    res.json({ stories: result.rows });
  } catch (err) {
    next(err);
  }
};

const getStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM stories WHERE id = $1 AND status = $2",
      [id, "published"]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Story not found" });
    }
    res.json({ story: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getAllStories = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM stories ORDER BY created_at DESC"
    );
    res.json({ stories: result.rows });
  } catch (err) {
    next(err);
  }
};

const createStory = async (req, res, next) => {
  try {
    const {
      title,
      excerpt,
      content,
      cover_image,
      author,
      category,
      read_time,
    } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const result = await pool.query(
      `INSERT INTO stories (title, excerpt, content, cover_image, author, category, read_time, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        sanitize(title),
        sanitize(excerpt),
        sanitize(content),
        cover_image || null,
        sanitize(author) || "NZ Cultural Events",
        category || "culture",
        read_time || 5,
        req.admin.id,
      ]
    );

    res.status(201).json({ story: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      excerpt,
      content,
      cover_image,
      author,
      category,
      read_time,
      status,
    } = req.body;

    const result = await pool.query(
      `UPDATE stories SET
        title = COALESCE($1, title),
        excerpt = COALESCE($2, excerpt),
        content = COALESCE($3, content),
        cover_image = $4,
        author = COALESCE($5, author),
        category = COALESCE($6, category),
        read_time = COALESCE($7, read_time),
        status = COALESCE($8, status),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        title ? sanitize(title) : null,
        excerpt ? sanitize(excerpt) : null,
        content ? sanitize(content) : null,
        cover_image !== undefined ? cover_image : null,
        author ? sanitize(author) : null,
        category || null,
        read_time || null,
        status || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Story not found" });
    }
    res.json({ story: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM stories WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Story not found" });
    }
    res.json({ message: "Story deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStories,
  getStory,
  getAllStories,
  createStory,
  updateStory,
  deleteStory,
};
