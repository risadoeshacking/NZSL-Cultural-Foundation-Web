-- NZSL Cultural Foundation — Database Schema
-- Run: psql nz_cultural_events < schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  full_description TEXT,
  date             DATE        NOT NULL,
  end_date         DATE,
  time_start       TEXT,
  time_end         TEXT,
  location         TEXT,
  category         TEXT        NOT NULL DEFAULT 'cultural',
  cover_image      TEXT,
  featured         BOOLEAN     NOT NULL DEFAULT FALSE,
  status           TEXT        NOT NULL DEFAULT 'published',
  created_by       UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- News
CREATE TABLE IF NOT EXISTS news (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  summary    TEXT,
  content    TEXT        NOT NULL,
  thumbnail  TEXT,
  category   TEXT        NOT NULL DEFAULT 'general',
  author     TEXT        NOT NULL DEFAULT 'NZSL Cultural Foundation',
  status     TEXT        NOT NULL DEFAULT 'published',
  created_by UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  excerpt     TEXT,
  content     TEXT        NOT NULL,
  cover_image TEXT,
  author      TEXT        NOT NULL DEFAULT 'NZSL Cultural Foundation',
  category    TEXT        NOT NULL DEFAULT 'culture',
  read_time   INTEGER     NOT NULL DEFAULT 5,
  status      TEXT        NOT NULL DEFAULT 'published',
  created_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gallery
CREATE TABLE IF NOT EXISTS gallery (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL DEFAULT 'Untitled',
  description TEXT,
  image_url   TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'general',
  photographer TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  featured    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leadership
CREATE TABLE IF NOT EXISTS leadership (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  role         TEXT        NOT NULL,
  bio          TEXT,
  contribution TEXT,
  photo_url    TEXT,
  category     TEXT        NOT NULL DEFAULT 'team' CHECK (category IN ('director','team')),
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  status       TEXT        NOT NULL DEFAULT 'active',
  created_by   UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site Settings (social media links, contact info, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL UNIQUE,
  value      TEXT        NOT NULL DEFAULT '',
  category   TEXT        NOT NULL DEFAULT 'general',
  label      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value, category, label) VALUES
  ('facebook_url',  '', 'social', 'Facebook URL'),
  ('instagram_url', '', 'social', 'Instagram URL'),
  ('youtube_url',   '', 'social', 'YouTube URL'),
  ('twitter_url',   '', 'social', 'X (Twitter) URL'),
  ('linkedin_url',  '', 'social', 'LinkedIn URL')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value, category, label) VALUES
  ('bank_account_name',   '', 'payment', 'Bank Account Name'),
  ('bank_account_number', '', 'payment', 'Bank Account Number'),
  ('bank_name',           '', 'payment', 'Bank Name'),
  ('payment_reference',   '', 'payment', 'Payment Reference Note')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value, category, label) VALUES
  ('contact_address', 'Wellington, New Zealand',        'contact', 'Address'),
  ('contact_phone',   '+64 4 567 8901',                  'contact', 'Phone'),
  ('contact_email',   'info@nzslfoundation.org.nz',      'contact', 'Email')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value, category, label) VALUES
  ('footer_tagline',   'Dedicated to preserving, showcasing, and celebrating Sri Lankan culture in Aotearoa New Zealand.', 'footer', 'Footer Tagline'),
  ('footer_copyright', '© 2026 NZSL Cultural Foundation. All rights reserved.', 'footer', 'Footer Copyright Text')
ON CONFLICT (key) DO NOTHING;

-- Memberships (Dancing / Vocals / Both registrations)
CREATE TABLE IF NOT EXISTS memberships (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  age_group      TEXT        NOT NULL CHECK (age_group IN ('16_and_under','16_and_over')),
  program        TEXT        NOT NULL CHECK (program IN ('dancing','vocals','both')),
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','waitlisted')),
  payment_status TEXT        NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  guardian_name  TEXT,
  guardian_phone TEXT,
  medical_notes  TEXT,
  consent_given  BOOLEAN     NOT NULL DEFAULT FALSE,
  activated_at   TIMESTAMPTZ,
  next_due_date  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, program)
);

-- Payment history for memberships (one row per recorded payment)
CREATE TABLE IF NOT EXISTS membership_payments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID        NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2),
  paid_at       DATE        NOT NULL DEFAULT CURRENT_DATE,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- YouTube videos
CREATE TABLE IF NOT EXISTS videos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  youtube_url TEXT        NOT NULL,
  video_id    TEXT        NOT NULL,
  category    TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partners & Sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  logo_url    TEXT,
  website_url TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'active',
  created_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Productions (Nadanu Pa, Pada Padma, World Drumming Festival, etc.)
CREATE TABLE IF NOT EXISTS productions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  slug             TEXT        NOT NULL UNIQUE,
  tagline          TEXT,
  description      TEXT,
  full_description TEXT,
  cover_image      TEXT,
  location         TEXT,
  status           TEXT        NOT NULL DEFAULT 'published',
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_by       UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link gallery photos and videos to a production (added after productions
-- since both tables are created earlier in this file)
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS production_id UUID REFERENCES productions(id) ON DELETE SET NULL;
ALTER TABLE videos  ADD COLUMN IF NOT EXISTS production_id UUID REFERENCES productions(id) ON DELETE SET NULL;

-- Programmes (Learn to Dance, Learn to Sing)
CREATE TABLE IF NOT EXISTS programmes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  status      TEXT        NOT NULL DEFAULT 'active',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programme classes (age group / level / timetable / fee within a programme)
CREATE TABLE IF NOT EXISTS programme_classes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id  UUID        NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  age_group     TEXT,
  schedule      TEXT,
  location      TEXT,
  fee_amount    NUMERIC(10,2),
  fee_period    TEXT        NOT NULL DEFAULT 'term',
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tutors
CREATE TABLE IF NOT EXISTS tutors (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  bio         TEXT,
  photo_url   TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'active',
  created_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which tutors teach which classes (many-to-many)
CREATE TABLE IF NOT EXISTS class_tutors (
  class_id UUID NOT NULL REFERENCES programme_classes(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, tutor_id)
);

-- Contact form enquiries
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT,
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
