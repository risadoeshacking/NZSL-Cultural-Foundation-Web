---
name: project-overview
description: Stack, key files, visual design language, and feature summary for the NZSL Cultural Foundation website
metadata:
  type: project
---

# NZSL Cultural Foundation Web

**Stack:** Flask (Python), PostgreSQL (psycopg), vanilla JS, CSS custom properties. No build step — files served directly from `public/`.

**Key files:**
- `app.py` — Flask app with all API routes (events, news, stories, gallery, leadership, settings, auth)
- `schema.sql` — PostgreSQL schema (run manually via psql)
- `public/index.html` — homepage
- `public/about.html` — about page (includes dynamic "Our Team" section from `/api/leadership`)
- `public/admin.html` + `public/js/admin.js` — admin CMS (login, dashboard, events, posts, gallery, stories, leadership, settings)
- `public/css/style.css` — all styles, dark elegant Sri Lankan cultural aesthetic

**DB tables:** admins, events, news, stories, gallery, leadership, site_settings

**Design language:** Dark background (`#0d0a08`), warm gold accent (`#d4760a`), Cormorant Garamond display font + Inter body, cinematic animations.

## Features built (as of 2026-06-28)

- Public About page has a "Our Team" section dynamically loading from `/api/leadership`
- Admin panel: no emojis in sidebar; sections = Dashboard, Events, Posts, Gallery, Stories, About—People, Social Media & Settings
- Posts section in admin manages the `news` table (title, summary, category, author, content, status)
- Leadership/People section in admin: add/edit/delete people with name, role, bio, contribution, sort_order, status
- Social media settings: admin enters Facebook/Instagram/YouTube/Twitter/LinkedIn URLs in Settings panel; footers on all pages load and display them as pill links
- `site_settings` table stores key/value pairs with category + label; seeded with social media keys

**Why:** Admin needed self-service control over About team members, news posts, and social media links without touching code.
