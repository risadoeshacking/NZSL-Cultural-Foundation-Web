const pool = require("../db/pool");
const xss = require("xss");

const sanitize = (str) => (str ? xss(str) : str);

const getGallery = async (req, res, next) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    let query = "SELECT * FROM gallery";
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` WHERE category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += " ORDER BY sort_order ASC, created_at DESC";

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
    res.json({ images: result.rows });
  } catch (err) {
    next(err);
  }
};

const getAllGallery = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM gallery ORDER BY sort_order ASC, created_at DESC"
    );
    res.json({ images: result.rows });
  } catch (err) {
    next(err);
  }
};

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const imageUrl = `/uploads/${req.uploadFolder || "gallery"}/${
      req.file.filename
    }`;
    const { title, description, category, photographer } = req.body;

    const result = await pool.query(
      `INSERT INTO gallery (title, description, image_url, category, photographer, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        sanitize(title) || "Untitled",
        sanitize(description) || null,
        imageUrl,
        category || "general",
        sanitize(photographer) || null,
        req.admin.id,
      ]
    );

    res.status(201).json({ image: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category, photographer, sort_order, featured } =
      req.body;

    const result = await pool.query(
      `UPDATE gallery SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        photographer = COALESCE($4, photographer),
        sort_order = COALESCE($5, sort_order),
        featured = COALESCE($6, featured),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        title ? sanitize(title) : null,
        description ? sanitize(description) : null,
        category || null,
        photographer ? sanitize(photographer) : null,
        sort_order !== undefined ? sort_order : null,
        featured !== undefined ? featured : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json({ image: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM gallery WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGallery,
  getAllGallery,
  uploadImage,
  updateImage,
  deleteImage,
};
