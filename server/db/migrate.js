require("dotenv").config();
const pool = require("./pool");

async function columnExists(client, table, column) {
  const res = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2
     LIMIT 1`,
    [table, column]
  );
  return res.rows.length > 0;
}

async function tableExists(client, table) {
  const res = await client.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_name = $1
     LIMIT 1`,
    [table]
  );
  return res.rows.length > 0;
}

async function ensureColumnTypesAndDefaults(client) {
  // Events: ensure full_description + created_by exist (controllers reference them)
  const eventsOk = await tableExists(client, "events");
  if (eventsOk) {
    if (!(await columnExists(client, "events", "full_description"))) {
      await client.query(
        `ALTER TABLE events ADD COLUMN full_description TEXT;`
      );
    }
    if (!(await columnExists(client, "events", "created_by"))) {
      await client.query(
        `ALTER TABLE events ADD COLUMN created_by UUID REFERENCES admins(id) ON DELETE SET NULL;`
      );
    }
  }

  // News: ensure created_by exists
  const newsOk = await tableExists(client, "news");
  if (newsOk && !(await columnExists(client, "news", "created_by"))) {
    await client.query(
      `ALTER TABLE news ADD COLUMN created_by UUID REFERENCES admins(id) ON DELETE SET NULL;`
    );
  }

  // Stories: ensure excerpt + created_by exist; schema uses subtitle but controllers reference excerpt
  const storiesOk = await tableExists(client, "stories");
  if (storiesOk) {
    if (!(await columnExists(client, "stories", "excerpt"))) {
      await client.query(`ALTER TABLE stories ADD COLUMN excerpt TEXT;`);
    }
    if (!(await columnExists(client, "stories", "created_by"))) {
      await client.query(
        `ALTER TABLE stories ADD COLUMN created_by UUID REFERENCES admins(id) ON DELETE SET NULL;`
      );
    }
    // If subtitle exists but excerpt doesn't have data, keep subtitle as-is.
  }

  // Gallery: ensure created_by exists (controllers reference it)
  const galleryOk = await tableExists(client, "gallery");
  if (galleryOk && !(await columnExists(client, "gallery", "created_by"))) {
    await client.query(
      `ALTER TABLE gallery ADD COLUMN created_by UUID REFERENCES admins(id) ON DELETE SET NULL;`
    );
  }

  // Page views indexing safety
  if (await tableExists(client, "page_views")) {
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page);`
    );
  }
}

async function ensureConstraints(client) {
  // Minimal constraints: keep safe defaults
  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date);`
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_news_status_created ON news(status, created_at DESC);`
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_stories_status_created ON stories(status, created_at DESC);`
  );
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureColumnTypesAndDefaults(client);
    await ensureConstraints(client);
    console.log("✅ Migration complete");
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
