const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: !process.env.DATABASE_URL
    ? process.env.PGHOST || "127.0.0.1"
    : undefined,
  port: !process.env.DATABASE_URL
    ? Number(process.env.PGPORT || 5432)
    : undefined,
  database: !process.env.DATABASE_URL ? process.env.PGDATABASE : undefined,
  user: !process.env.DATABASE_URL ? process.env.PGUSER : undefined,
  password: !process.env.DATABASE_URL ? process.env.PGPASSWORD : undefined,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = pool;
