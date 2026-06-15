const pool = require("../db/pool");
const xss = require("xss");

const sanitize = (str) => (str ? xss(str) : str);

// Public: Get active leadership
const getLeadership = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM leadership WHERE status = $1 ORDER BY sort_order ASC",
      ["active"]
    );
    res.json({ leaders: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Get all leadership
const getAllLeadership = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM leadership ORDER BY sort_order ASC"
    );
    res.json({ leaders: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Create leader
const createLeader = async (req, res, next) => {
  try {
    const {
      name,
      role,
      bio,
      portrait_url,
      contribution,
      sort_order,
      featured,
    } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "Name and role are required" });
    }

    const result = await pool.query(
      `INSERT INTO leadership (name, role, bio, portrait_url, contribution, sort_order, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        sanitize(name),
        sanitize(role),
        sanitize(bio) || null,
        portrait_url || null,
        sanitize(contribution) || null,
        sort_order || 0,
        featured || false,
      ]
    );

    res.status(201).json({ leader: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Update leader
const updateLeader = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      role,
      bio,
      portrait_url,
      contribution,
      sort_order,
      featured,
      status,
    } = req.body;

    const result = await pool.query(
      `UPDATE leadership SET
        name = COALESCE($1, name),
        role = COALESCE($2, role),
        bio = $3,
        portrait_url = $4,
        contribution = $5,
        sort_order = COALESCE($6, sort_order),
        featured = COALESCE($7, featured),
        status = COALESCE($8, status),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        name ? sanitize(name) : null,
        role ? sanitize(role) : null,
        bio !== undefined ? sanitize(bio) : null,
        portrait_url !== undefined ? portrait_url : null,
        contribution !== undefined ? sanitize(contribution) : null,
        sort_order !== undefined ? sort_order : null,
        featured !== undefined ? featured : null,
        status || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Leader not found" });
    }
    res.json({ leader: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Admin: Delete leader
const deleteLeader = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM leadership WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Leader not found" });
    }
    res.json({ message: "Leader deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLeadership,
  getAllLeadership,
  createLeader,
  updateLeader,
  deleteLeader,
};
