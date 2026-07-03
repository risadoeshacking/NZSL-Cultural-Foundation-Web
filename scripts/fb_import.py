# -*- coding: utf-8 -*-
"""
NZSL Cultural Foundation - Facebook Public Page Scraper
========================================================
Scrapes a PUBLIC Facebook page (no admin access, no API key needed)
using the facebook-scraper library and imports posts + images into
the database.

INSTALL FIRST:
  pip install facebook-scraper requests

USAGE:
  # Set the page name/URL in .env:
  #   FB_PAGE=NZSLCulturalFoundation
  # Then run:
  python scripts/fb_import.py

  # Optional: if the page ever requires login (private/age-gated),
  # add your own Facebook credentials to .env:
  #   FB_EMAIL=you@email.com
  #   FB_PASSWORD=yourpassword
  # The script will log in just to fetch the page, then stop.

NOTE: This scrapes the public mbasic.facebook.com version of the page
(plain HTML, no JS required). It is fragile — if Facebook changes their
HTML the library may break. Run it periodically to re-sync content.
"""

import os
import sys
import uuid
import time
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ[k.strip()] = v.strip()  # always override

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
_fb_raw    = os.environ.get("FB_PAGE", "").strip()
FB_PAGE    = _fb_raw.rstrip("/").split("/")[-1] if _fb_raw else ""
FB_EMAIL   = os.environ.get("FB_EMAIL", "").strip()
FB_PASS    = os.environ.get("FB_PASSWORD", "").strip()
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(Path(__file__).parent.parent / "uploads")))
DB_URL     = os.environ.get("DATABASE_URL", "")

if not FB_PAGE:
    print("""
[ERROR] Set FB_PAGE in your .env file, e.g.:
    FB_PAGE=NZSLCulturalFoundation
    (or the full URL: https://www.facebook.com/NZSLCulturalFoundation)
""")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Check facebook-scraper is installed
# ---------------------------------------------------------------------------
try:
    from facebook_scraper import get_posts
except Exception as _fb_err:
    print(f"[ERROR] Could not import facebook-scraper: {_fb_err}")
    print("  Run:  pip3 install facebook-scraper requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------
try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    print("[ERROR] psycopg not installed. Run:  pip install psycopg[binary]")
    sys.exit(1)

def _conninfo():
    if DB_URL:
        return DB_URL
    parts = []
    for k, env in [("host","PGHOST"),("port","PGPORT"),("dbname","PGDATABASE"),
                   ("user","PGUSER"),("password","PGPASSWORD")]:
        v = os.environ.get(env)
        if v: parts.append(f"{k}={v}")
    return " ".join(parts) or "host=127.0.0.1 port=5432"

def db_q(sql, params=None):
    try:
        with psycopg.connect(_conninfo(), row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params or [])
                if cur.description:
                    return cur.fetchall()
            conn.commit()
        return []
    except Exception as e:
        print(f"[DB ERROR] {e}")
        print(f"[DB INFO] conninfo = {_conninfo()}")
        raise

def db_ex(sql, params=None):
    try:
        with psycopg.connect(_conninfo()) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params or [])
            conn.commit()
    except Exception as e:
        print(f"[DB ERROR] {e}")
        print(f"[DB INFO] conninfo = {_conninfo()}")
        raise

# ---------------------------------------------------------------------------
# Get or create import admin
# ---------------------------------------------------------------------------
def get_admin_id() -> str:
    rows = db_q("SELECT id FROM admins LIMIT 1")
    if rows:
        return str(rows[0]["id"])
    aid = str(uuid.uuid4())
    db_ex(
        "INSERT INTO admins (id,email,name,password_hash,role) VALUES (%s,%s,%s,%s,%s)",
        [aid, "fb-import@nzslfoundation.org.nz", "FB Importer", "$2b$12$placeholder", "admin"],
    )
    return aid

# ---------------------------------------------------------------------------
# Image downloader
# ---------------------------------------------------------------------------
def download_image(url: str, subfolder: str = "fb") -> str | None:
    if not url:
        return None
    try:
        ext  = ".jpg"
        path = urllib.parse.urlparse(url).path
        _, detected = os.path.splitext(path)
        if detected.lower() in {".jpg",".jpeg",".png",".gif",".webp"}:
            ext = detected.lower()

        dest_dir = UPLOAD_DIR / subfolder
        dest_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        dest     = dest_dir / filename

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            dest.write_bytes(resp.read())

        return f"/uploads/{subfolder}/{filename}"
    except Exception as e:
        print(f"    [WARN] Image download failed: {e}")
        return None

# ---------------------------------------------------------------------------
# Build get_posts kwargs
# ---------------------------------------------------------------------------
def make_options() -> dict:
    if not FB_EMAIL or not FB_PASS:
        print("""
[WARNING] FB_EMAIL and FB_PASSWORD are not set in .env
  Facebook blocks anonymous scraping — you will get 0 posts.
  Add your Facebook login credentials to .env:
    FB_EMAIL=you@example.com
    FB_PASSWORD=yourpassword
  Use a secondary/dummy account, not your main account.
""")
    opts = {
        "pages": 10,
        "timeout": 30,
        "allow_extra_requests": True,
        "extra_info": True,
    }
    if FB_EMAIL and FB_PASS:
        opts["credentials"] = (FB_EMAIL, FB_PASS)
    return opts

# ---------------------------------------------------------------------------
# Import posts
# ---------------------------------------------------------------------------
def import_posts(admin_id: str):
    print(f"\n📥  Scraping public posts from: {FB_PAGE}")
    print("    (This may take a minute — be patient)\n")

    news_count    = 0
    gallery_count = 0
    skipped       = 0

    try:
        for post in get_posts(FB_PAGE, **make_options()):
            text  = (post.get("text") or "").strip()
            image = post.get("image") or post.get("images", [None])[0]
            time_ = post.get("time")   # datetime object or None

            if not text and not image:
                skipped += 1
                continue

            # Format date
            if isinstance(time_, datetime):
                post_date = time_.date().isoformat()
            else:
                post_date = datetime.now(tz=timezone.utc).date().isoformat()

            # --- Gallery: image-heavy posts with little text ---
            if image and len(text) < 80:
                caption = text or "Cultural photo"
                local   = download_image(image, "fb-gallery")
                if local:
                    exists = db_q("SELECT id FROM gallery WHERE image_url=%s", [local])
                    if not exists:
                        db_ex(
                            "INSERT INTO gallery (title,description,image_url,category,photographer,created_by,created_at) "
                            "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                            [caption[:200], caption, local, "events",
                             "NZSL Cultural Foundation", admin_id, post_date],
                        )
                        gallery_count += 1
                        print(f"  🖼  Gallery: {caption[:55]}")
                continue

            # --- News: text posts (with or without image) ---
            if not text or len(text) < 30:
                skipped += 1
                continue

            lines  = [l.strip() for l in text.splitlines() if l.strip()]
            title  = lines[0][:200]
            body   = "\n\n".join(lines) if len(lines) > 1 else text
            summary = body[:280]

            # Skip duplicates
            exists = db_q(
                "SELECT id FROM news WHERE title=%s AND created_at::date=%s::date",
                [title, post_date],
            )
            if exists:
                skipped += 1
                continue

            # Download image if present
            cover = download_image(image, "fb-news") if image else None

            db_ex(
                "INSERT INTO news (title,summary,content,thumbnail,category,author,status,created_by,created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                [title, summary, body, cover, "community",
                 "NZSL Cultural Foundation", "published", admin_id, post_date],
            )
            news_count += 1
            print(f"  📰 News: {title[:60]}")

            time.sleep(0.2)  # gentle rate limit

    except Exception as e:
        print(f"\n  [ERROR] Scraping stopped: {e}")
        print("  Tip: if Facebook is blocking, add your FB_EMAIL + FB_PASSWORD to .env")

    print(f"\n  → {news_count} news posts, {gallery_count} gallery images imported ({skipped} skipped)")
    if news_count == 0 and gallery_count == 0:
        print("\n  [!] 0 posts imported. Common causes:")
        print("      1. FB_EMAIL / FB_PASSWORD not set in .env (most likely)")
        print("      2. Wrong page name — check the exact URL on Facebook")
        print(f"         Current page: {FB_PAGE}")
        print("      3. Facebook temporarily blocking the request — try again later")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("  NZSL Cultural Foundation — Facebook Page Scraper")
    print("=" * 60)
    print(f"  Page   : {FB_PAGE}")
    print(f"  Login  : {'yes (from .env)' if FB_EMAIL else 'no (public only)'}")

    admin_id = get_admin_id()
    import_posts(admin_id)

    print("\n✅  Import complete!")
    print("    Run again any time to pull new posts.")

if __name__ == "__main__":
    main()
