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
