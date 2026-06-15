const pool = require("./pool");

const schema = `
  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Admins table
  CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Events table
  CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    end_date DATE,
    time_start VARCHAR(20),
    time_end VARCHAR(20),
    location VARCHAR(500),
    address VARCHAR(500),
    category VARCHAR(100) NOT NULL DEFAULT 'cultural',
    cover_image VARCHAR(500),
    gallery_images TEXT[] DEFAULT '{}',
    featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'published',
    max_attendees INTEGER,
    ticket_url VARCHAR(500),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- News table
  CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    thumbnail VARCHAR(500),
    category VARCHAR(100) DEFAULT 'general',
    author VARCHAR(255) DEFAULT 'NZ Cultural Events',
    status VARCHAR(50) DEFAULT 'published',
    featured BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Gallery table
  CREATE TABLE IF NOT EXISTS gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500),
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    category VARCHAR(100) DEFAULT 'general',
    photographer VARCHAR(255),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Cultural Stories table
  CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    content TEXT NOT NULL,
    cover_image VARCHAR(500),
    author VARCHAR(255),
    category VARCHAR(100) DEFAULT 'culture',
    featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'published',
    read_time INTEGER DEFAULT 5,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Settings table
  CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(100) DEFAULT 'general',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Leadership table
  CREATE TABLE IF NOT EXISTS leadership (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    bio TEXT,
    portrait_url VARCHAR(500),
    contribution TEXT,
    sort_order INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Contact form submissions
  CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'unread',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
  CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
  CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  CREATE INDEX IF NOT EXISTS idx_events_featured ON events(featured);
  CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
  CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
  CREATE INDEX IF NOT EXISTS idx_news_featured ON news(featured);
  CREATE INDEX IF NOT EXISTS idx_news_created ON news(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery(category);
  CREATE INDEX IF NOT EXISTS idx_gallery_featured ON gallery(featured);
  CREATE INDEX IF NOT EXISTS idx_gallery_sort ON gallery(sort_order);
  CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
  CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories(featured);
  CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
  CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
  CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page);
  CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);
`;

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log("🔄 Initializing database schema...");
    await client.query(schema);
    console.log("✅ Database schema created successfully!");

    // Insert default settings
    const defaultSettings = [
      ["site_name", "NZ Cultural Events", "general"],
      ["site_tagline", "Connecting Communities Through Culture", "general"],
      [
        "site_description",
        "Discover and celebrate the rich cultural tapestry of New Zealand through events, festivals, art, and community stories.",
        "general",
      ],
      ["contact_email", "info@nzevents.co.nz", "contact"],
      ["contact_phone", "+64 4 123 4567", "contact"],
      ["contact_address", "Wellington, New Zealand", "contact"],
      ["social_facebook", "https://facebook.com/nzevents", "social"],
      ["social_instagram", "https://instagram.com/nzevents", "social"],
      ["social_twitter", "https://twitter.com/nzevents", "social"],
      ["hero_video_url", "", "homepage"],
      ["featured_events_count", "6", "homepage"],
      ["gallery_per_page", "20", "homepage"],
    ];

    for (const [key, value, category] of defaultSettings) {
      await client.query(
        "INSERT INTO settings (key, value, category) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING",
        [key, value, category]
      );
    }
    console.log("✅ Default settings inserted!");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database initialization complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database initialization failed:", err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
