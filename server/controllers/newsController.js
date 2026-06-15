const pool = require("../db/pool");
const xss = require("xss");

const sanitize = (str) => (str ? xss(str) : str);

const getNews = async (req, res, next) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    let query = "SELECT * FROM news WHERE status = $1";
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
    res.json({ news: result.rows });
  } catch (err) {
    next(err);
  }
};

const getArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM news WHERE id = $1 AND status = $2",
      [id, "published"]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json({ article: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getAllNews = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM news ORDER BY created_at DESC"
    );
    res.json({ news: result.rows });
  } catch (err) {
    next(err);
  }
};

const createArticle = async (req, res, next) => {
  try {
    const { title, summary, content, thumbnail, category, author } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const result = await pool.query(
      `INSERT INTO news (title, summary, content, thumbnail, category, author, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        sanitize(title),
        sanitize(summary),
        sanitize(content),
        thumbnail || null,
        category || "general",
        sanitize(author) || "NZ Cultural Events",
        req.admin.id,
      ]
    );

    res.status(201).json({ article: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, summary, content, thumbnail, category, author, status } =
      req.body;

    const result = await pool.query(
      `UPDATE news SET
        title = COALESCE($1, title),
        summary = COALESCE($2, summary),
        content = COALESCE($3, content),
        thumbnail = $4,
        category = COALESCE($5, category),
        author = COALESCE($6, author),
        status = COALESCE($7, status),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        title ? sanitize(title) : null,
        summary ? sanitize(summary) : null,
        content ? sanitize(content) : null,
        thumbnail !== undefined ? thumbnail : null,
        category || null,
        author ? sanitize(author) : null,
        status || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json({ article: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM news WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json({ message: "Article deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNews,
  getArticle,
  getAllNews,
  createArticle,
  updateArticle,
  deleteArticle,
};
