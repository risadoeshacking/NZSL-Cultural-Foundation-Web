-- Migration: Add date to videos, update categories, add gallery event_id support
-- Run: python scripts/migrate.py

-- Add date column to videos
ALTER TABLE videos ADD COLUMN IF NOT EXISTS date DATE;

-- Reclassify existing video categories to new taxonomy
UPDATE videos SET category = 'Performances' WHERE category = 'performances';
UPDATE videos SET category = 'Classes' WHERE category = 'classes';
UPDATE videos SET category = 'General' WHERE category = 'general' OR category IS NULL;

-- Reclassify existing gallery categories to new taxonomy
UPDATE gallery SET category = 'Performances' WHERE category = 'performances';
UPDATE gallery SET category = 'Classes' WHERE category = 'classes';
UPDATE gallery SET category = 'General' WHERE category IN ('general', 'heritage', 'culture', 'arts', 'events');