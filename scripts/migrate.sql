-- Migration: add columns to leadership + create site_settings
-- Run: psql $DATABASE_URL < scripts/migrate.sql

-- Leadership: add contribution and status columns (safe to re-run)
ALTER TABLE leadership ADD COLUMN IF NOT EXISTS contribution TEXT;
ALTER TABLE leadership ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL UNIQUE,
  value      TEXT        NOT NULL DEFAULT '',
  category   TEXT        NOT NULL DEFAULT 'general',
  label      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed social media keys (skip if already exist)
INSERT INTO site_settings (key, value, category, label) VALUES
  ('facebook_url',  '', 'social', 'Facebook URL'),
  ('instagram_url', '', 'social', 'Instagram URL'),
  ('youtube_url',   '', 'social', 'YouTube URL'),
  ('twitter_url',   '', 'social', 'X (Twitter) URL'),
  ('linkedin_url',  '', 'social', 'LinkedIn URL')
ON CONFLICT (key) DO NOTHING;

-- Payment settings for the membership system
INSERT INTO site_settings (key, value, category, label) VALUES
  ('bank_account_name',   '', 'payment', 'Bank Account Name'),
  ('bank_account_number', '', 'payment', 'Bank Account Number'),
  ('bank_name',           '', 'payment', 'Bank Name'),
  ('payment_reference',   '', 'payment', 'Payment Reference Note')
ON CONFLICT (key) DO NOTHING;

-- Memberships (Dancing / Vocals / Both registrations)
CREATE TABLE IF NOT EXISTS memberships (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  age_group      TEXT        NOT NULL CHECK (age_group IN ('16_and_under','16_and_over')),
  program        TEXT        NOT NULL CHECK (program IN ('dancing','vocals','both')),
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  payment_status TEXT        NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid')),
  activated_at   TIMESTAMPTZ,
  next_due_date  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, program)
);

-- YouTube videos
CREATE TABLE IF NOT EXISTS videos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  youtube_url TEXT        NOT NULL,
  video_id    TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_by  UUID        REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
