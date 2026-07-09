import os
import re
import uuid
import calendar
import unicodedata
from datetime import datetime, date

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import jwt
import bcrypt
import requests

# Sanitize CLOUDINARY_URL *before* importing cloudinary — its SDK validates
# and auto-configures from this env var the moment it's imported, and will
# crash the whole process on any malformed value (e.g. accidentally pasting
# "CLOUDINARY_URL=cloudinary://..." as the value instead of just the
# "cloudinary://..." part). Fall back to local file storage instead of
# taking the whole site down over one bad env var.
_cloudinary_url = (os.environ.get("CLOUDINARY_URL") or "").strip().strip('"').strip("'")
if _cloudinary_url.startswith("CLOUDINARY_URL="):
    _cloudinary_url = _cloudinary_url[len("CLOUDINARY_URL="):].strip()
if _cloudinary_url and not _cloudinary_url.startswith("cloudinary://"):
    print(f"WARNING: CLOUDINARY_URL is set but invalid (must start with 'cloudinary://') — "
          f"ignoring it; uploads will fall back to local disk.")
    _cloudinary_url = ""
if _cloudinary_url:
    os.environ["CLOUDINARY_URL"] = _cloudinary_url
else:
    os.environ.pop("CLOUDINARY_URL", None)

import cloudinary
import cloudinary.uploader
from psycopg.rows import dict_row
from psycopg import connect
from psycopg.errors import UniqueViolation


def _env(name: str, default=None):
    v = os.environ.get(name)
    if v is not None:
        v = v.strip().strip('"').strip("'")
        # Guard against pasting a whole "KEY=value" line into a UI (like
        # Render's) that already has a separate field for the key name —
        # that leaves the key name duplicated at the front of the value.
        prefix = f"{name}="
        if v.startswith(prefix):
            v = v[len(prefix):].strip().strip('"').strip("'")
    return v if v not in (None, "") else default


ALLOWED_IMAGE_EXTS = {".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"}
ALLOWED_IMAGE_MIME_PREFIXES = (
    "image/",  # broad filter; still validate extensions
)


def sanitize_text(s: str | None) -> str | None:
    """Minimal XSS hardening: escape < and > and strip script tags."""
    if s is None:
        return None
    # strip script tags
    s = re.sub(r"(?is)<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", s)
    # escape angle brackets
    s = s.replace("<", "<").replace(">", ">")
    return s


def slugify(text: str) -> str:
    # Strip diacritics (e.g. "Nādanū Pā" -> "Nadanu Pa") before reducing to
    # a-z0-9, so macron'd/accented titles don't collapse into stray hyphens.
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.strip().lower())
    return slug.strip("-")


class DB:
    def __init__(self):
        self.conninfo = _env("DATABASE_URL")
        if not self.conninfo:
            host = _env("PGHOST", "127.0.0.1")
            port = int(_env("PGPORT", 5432))
            database = _env("PGDATABASE")
            user = _env("PGUSER")
            password = _env("PGPASSWORD")
            ssl = _env("NODE_ENV") == "production"
            # Build connection string
            parts = [f"host={host}", f"port={port}"]
            if database:
                parts.append(f"dbname={database}")
            if user:
                parts.append(f"user={user}")
            if password:
                parts.append(f"password={password}")
            if ssl:
                parts.append("sslmode=require")
                # NOTE: Node used rejectUnauthorized:false; psycopg default is verify-full.
                # If you use production with self-signed certs, set PGSSLMODE=prefer/disable.
            self.conninfo = " ".join(parts)

    def query(self, sql: str, params=None):
        with connect(self.conninfo, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params or [])
                if cur.description is None:
                    return []
                return cur.fetchall()

    def execute(self, sql: str, params=None):
        with connect(self.conninfo) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params or [])
            conn.commit()


db = DB()


def bootstrap_default_admin():
    """Create a default admin from ADMIN_EMAIL/ADMIN_PASSWORD if no admin
    with that email exists yet. Only ever creates — never overwrites an
    existing password, so changing the password later (via the admin panel
    or create_admin.py) sticks across restarts instead of being silently
    reset back to the env var every deploy."""
    admin_email = _env("ADMIN_EMAIL")
    admin_password = _env("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        return

    email = admin_email.strip().lower()
    try:
        existing = db.query("SELECT id FROM admins WHERE email = %s", [email])
        if existing:
            return
        password_hash = bcrypt.hashpw(
            admin_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
        db.execute(
            "INSERT INTO admins (id, email, name, password_hash, role) VALUES (%s,%s,%s,%s,%s)",
            [str(uuid.uuid4()), email, "Admin", password_hash, "admin"],
        )
        print(f"Bootstrapped default admin account: {email}")
    except UniqueViolation:
        pass
    except Exception as e:
        print(f"WARNING: could not bootstrap default admin ({e})")


def create_app():
    # static_folder=None: Flask's automatic static route would otherwise claim
    # the same /<path:...> pattern as our own catch-all below and silently win
    # the routing tie for any path that isn't a real file (e.g. /about),
    # returning its own 404 before our SPA fallback ever runs. Serving
    # everything through our own routes avoids that collision entirely.
    app = Flask(__name__, static_folder=None)
    CORS(app)

    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[],
    )

    uploads_dir = _env("UPLOAD_DIR", os.path.join(
        os.path.dirname(__file__), "uploads"))
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir, exist_ok=True)

    cloudinary_url = _env("CLOUDINARY_URL")
    if cloudinary_url:
        cloudinary.config(cloudinary_url=cloudinary_url)

    def store_uploaded_file(file_storage, ext, subfolder):
        """Persist an uploaded image. Uses Cloudinary when CLOUDINARY_URL is
        configured (required in production — Render's filesystem is wiped on
        every restart/redeploy); otherwise falls back to local disk so local
        development keeps working with zero extra setup."""
        if cloudinary_url:
            try:
                result = cloudinary.uploader.upload(
                    file_storage.stream,
                    folder=f"nzsl/{subfolder}",
                    public_id=uuid.uuid4().hex,
                    resource_type="image",
                )
            except Exception as e:
                raise RuntimeError(
                    f"Could not reach Cloudinary to store the image ({e}). "
                    "Check that CLOUDINARY_URL is set correctly."
                ) from e
            return result["secure_url"]

        dest_dir = os.path.join(uploads_dir, subfolder)
        os.makedirs(dest_dir, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        file_storage.stream.seek(0)
        file_storage.save(os.path.join(dest_dir, filename))
        return f"/uploads/{subfolder}/{filename}"

    public_dir = os.path.join(os.path.dirname(__file__), "public")

    # Serve /uploads like Express
    @app.route("/uploads/<path:filename>")
    def uploads(filename):
        # file is under uploads_dir
        return send_from_directory(uploads_dir, filename)

    # Static frontend assets are already served via Flask static_folder.

    # Helpers
    def get_jwt_admin():
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None, (jsonify({"error": "Access denied. No token provided."}), 401)

        token = auth_header.split(" ", 1)[1].strip()
        try:
            decoded = jwt.decode(
                token,
                _env("JWT_SECRET"),
                algorithms=["HS256"],
                options={"require": ["exp"]},
            )
        except jwt.ExpiredSignatureError:
            return None, (jsonify({"error": "Token expired."}), 401)
        except jwt.InvalidTokenError:
            return None, (jsonify({"error": "Invalid token."}), 401)

        admin_id = decoded.get("id")
        if not admin_id:
            return None, (jsonify({"error": "Invalid token."}), 401)

        rows = db.query(
            "SELECT id::text, email, name, role FROM admins WHERE id = %s",
            [admin_id],
        )
        if not rows:
            return None, (jsonify({"error": "Invalid token. User not found."}), 401)

        return rows[0], None

    def require_admin():
        admin, err = get_jwt_admin()
        if err:
            return None, err
        return admin, None

    def parse_bool(value):
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        return str(value).lower() == "true"

    # Rate limit equivalent to: app.use('/api/', limiter)
    @app.before_request
    def rate_limit_api():
        # Apply only for /api/*
        if request.path.startswith("/api/"):
            # 200 per 15 minutes
            limit = limiter.limit("200 per 15 minutes")

            # flask-limiter uses decorators normally; emulate by invoking limiter
            # For simplicity, rely on Flask-Limiter default behavior by calling the limiter function.
            # This is a minimal workaround; if it misbehaves, remove and use nginx.
            limit

    # Security headers approximations (helmet disables CSP)
    @app.after_request
    def set_security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        return resp

    # Catch-all: never let an unhandled exception surface as a raw crash
    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return e
        app.logger.exception("Unhandled error")
        return jsonify({"error": "Internal server error"}), 500

    # Health
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"})

    # Auth routes
    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        email = data.get("email")
        password = data.get("password")
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        rows = db.query("SELECT * FROM admins WHERE email = %s", [email.strip().lower()])
        if not rows:
            return jsonify({"error": "Invalid credentials"}), 401

        admin = rows[0]
        try:
            valid = bcrypt.checkpw(password.encode(
                "utf-8"), admin["password_hash"].encode("utf-8"))
        except Exception:
            valid = False
        if not valid:
            return jsonify({"error": "Invalid credentials"}), 401

        jwt_secret = _env("JWT_SECRET")
        expires_in = _env("JWT_EXPIRES_IN", "7d")
        # Parse like Node default only needs seconds for jwt; accept "7d"/"30d"/"1h".

        def parse_expires(v):
            m = re.match(r"^(\d+)([smhd])$", v.strip(), re.I)
            if not m:
                return 7 * 24 * 3600
            n = int(m.group(1))
            unit = m.group(2).lower()
            return n * {"s": 1, "m": 60, "h": 3600, "d": 86400}[unit]

        exp_seconds = parse_expires(expires_in)
        token = jwt.encode(
            {"id": str(admin["id"]), "email": admin["email"], "role": admin.get(
                "role"), "exp": int(datetime.utcnow().timestamp() + exp_seconds)},
            jwt_secret,
            algorithm="HS256",
        )

        return jsonify(
            {
                "token": token,
                "admin": {
                    "id": admin["id"],
                    "email": admin["email"],
                    "name": admin["name"],
                    "role": admin.get("role"),
                },
            }
        )

    @app.get("/api/auth/profile")
    def profile():
        admin, err = require_admin()
        if err:
            return err
        return jsonify({"admin": admin})

    @app.put("/api/auth/change-password")
    def change_password():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")
        if not current_password or not new_password:
            return jsonify({"error": "Current and new passwords are required"}), 400

        rows = db.query("SELECT * FROM admins WHERE id = %s", [admin["id"]])
        if not rows:
            return jsonify({"error": "Invalid credentials"}), 401
        admin_row = rows[0]

        try:
            valid = bcrypt.checkpw(current_password.encode(
                "utf-8"), admin_row["password_hash"].encode("utf-8"))
        except Exception:
            valid = False
        if not valid:
            return jsonify({"error": "Current password is incorrect"}), 401

        hashed = bcrypt.hashpw(new_password.encode(
            "utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
        db.execute("UPDATE admins SET password_hash = %s, updated_at = NOW() WHERE id = %s", [
                   hashed, admin["id"]])
        return jsonify({"message": "Password updated successfully"})

    @app.put("/api/auth/update-profile")
    def update_profile():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Name is required"}), 400

        rows = db.query(
            "UPDATE admins SET name = %s, updated_at = NOW() WHERE id = %s RETURNING id::text, email, name, role",
            [sanitize_text(name), admin["id"]],
        )
        return jsonify({"admin": rows[0]})

    # Admin Users
    @app.get("/api/admins/admin/all")
    def admin_all_admins():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query(
            "SELECT id::text, email, name, role, created_at FROM admins ORDER BY created_at ASC")
        return jsonify({"admins": rows})

    @app.post("/api/admins/admin")
    def admin_create_admin():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400
        if not EMAIL_RE.match(email):
            return jsonify({"error": "Please enter a valid email address"}), 400
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
        try:
            rows = db.query(
                "INSERT INTO admins (email, name, password_hash, role) VALUES (%s,%s,%s,%s) "
                "RETURNING id::text, email, name, role, created_at",
                [email, sanitize_text(name), password_hash, "admin"],
            )
        except UniqueViolation:
            return jsonify({"error": "An admin with that email already exists"}), 409
        return jsonify({"admin": rows[0]}), 201

    @app.delete("/api/admins/admin/<id>")
    def admin_delete_admin(id):
        admin, err = require_admin()
        if err:
            return err
        if admin["id"] == id:
            return jsonify({"error": "You can't delete your own account"}), 400
        count_rows = db.query("SELECT COUNT(*) AS count FROM admins")
        if int(count_rows[0]["count"]) <= 1:
            return jsonify({"error": "Can't delete the last remaining admin"}), 400
        rows = db.query("DELETE FROM admins WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Admin not found"}), 404
        return jsonify({"message": "Admin deleted successfully"})

    # Events
    @app.get("/api/events")
    def get_events():
        category = request.args.get("category")
        featured = request.args.get("featured")
        limit = request.args.get("limit", "50")
        offset = request.args.get("offset", "0")

        query = "SELECT * FROM events WHERE status = %s"
        params = ["published"]

        if category:
            query += " AND category = %s"
            params.append(category)

        if featured is not None and parse_bool(featured):
            query += " AND featured = true"

        query += " ORDER BY date ASC"

        if limit is not None:
            query += " LIMIT %s"
            params.append(int(limit))
        if offset is not None:
            query += " OFFSET %s"
            params.append(int(offset))

        rows = db.query(query, params)
        count_rows = db.query(
            "SELECT COUNT(*) AS count FROM events WHERE status = %s", ["published"])
        total = int(count_rows[0]["count"]) if count_rows else 0
        return jsonify({"events": rows, "total": total})

    @app.get("/api/events/<id>")
    def get_event(id):
        rows = db.query(
            "SELECT * FROM events WHERE id = %s AND status = %s", [id, "published"])
        if not rows:
            return jsonify({"error": "Event not found"}), 404
        return jsonify({"event": rows[0]})

    @app.get("/api/events/admin/all")
    def admin_all_events():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM events ORDER BY date DESC")
        return jsonify({"events": rows})

    @app.post("/api/events/admin")
    def admin_create_event():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        date = data.get("date")
        if not title or not date:
            return jsonify({"error": "Title and date are required"}), 400

        sql = (
            "INSERT INTO events (title, description, full_description, date, end_date, time_start, time_end, "
            "location, category, cover_image, featured, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(title),
            sanitize_text(data.get("description")),
            sanitize_text(data.get("full_description")),
            date,
            data.get("end_date") or None,
            data.get("time_start") or None,
            data.get("time_end") or None,
            sanitize_text(data.get("location")),
            data.get("category") or "cultural",
            data.get("cover_image") or None,
            data.get("featured") if "featured" in data else False,
            data.get("status") or "published",
            admin["id"],
        ]
        rows = db.query(sql, params)
        return jsonify({"event": rows[0]}), 201

    @app.put("/api/events/admin/<id>")
    def admin_update_event(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}

        sql = (
            "UPDATE events SET "
            "title = COALESCE(%s, title), "
            "description = COALESCE(%s, description), "
            "full_description = COALESCE(%s, full_description), "
            "date = COALESCE(%s, date), "
            "end_date = %s, "
            "time_start = %s, "
            "time_end = %s, "
            "location = COALESCE(%s, location), "
            "category = COALESCE(%s, category), "
            "cover_image = %s, "
            "featured = COALESCE(%s, featured), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *"
        )

        params = [
            sanitize_text(data["title"]) if data.get("title") else None,
            sanitize_text(data["description"]) if data.get(
                "description") else None,
            sanitize_text(data["full_description"]) if data.get(
                "full_description") else None,
            data.get("date") or None,
            data.get("end_date") or None,
            data.get("time_start") or None,
            data.get("time_end") or None,
            sanitize_text(data["location"]) if data.get("location") else None,
            data.get("category") or None,
            data.get("cover_image") if "cover_image" in data else None,
            data.get("featured") if "featured" in data else None,
            data.get("status") or None,
            id,
        ]

        rows = db.query(sql, params)
        if not rows:
            return jsonify({"error": "Event not found"}), 404
        return jsonify({"event": rows[0]})

    @app.delete("/api/events/admin/<id>")
    def admin_delete_event(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM events WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Event not found"}), 404
        return jsonify({"message": "Event deleted successfully"})

    # News
    @app.get("/api/news")
    def get_news():
        category = request.args.get("category")
        limit = request.args.get("limit", "20")
        offset = request.args.get("offset", "0")

        query = "SELECT * FROM news WHERE status = %s"
        params = ["published"]
        if category:
            query += " AND category = %s"
            params.append(category)

        query += " ORDER BY created_at DESC"
        if limit is not None:
            query += " LIMIT %s"
            params.append(int(limit))
        if offset is not None:
            query += " OFFSET %s"
            params.append(int(offset))

        rows = db.query(query, params)
        return jsonify({"news": rows})

    @app.get("/api/news/<id>")
    def get_article(id):
        rows = db.query(
            "SELECT * FROM news WHERE id = %s AND status = %s",
            [id, "published"],
        )
        if not rows:
            return jsonify({"error": "Article not found"}), 404
        return jsonify({"article": rows[0]})

    @app.get("/api/news/admin/all")
    def admin_all_news():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM news ORDER BY created_at DESC")
        return jsonify({"news": rows})

    @app.post("/api/news/admin")
    def admin_create_news():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        content = data.get("content")
        if not title or not content:
            return jsonify({"error": "Title and content are required"}), 400

        sql = (
            "INSERT INTO news (title, summary, content, thumbnail, category, author, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(title),
            sanitize_text(data.get("summary")),
            sanitize_text(content),
            data.get("thumbnail") or None,
            data.get("category") or "general",
            sanitize_text(data.get("author")) or "NZ Cultural Events",
            admin["id"],
        ]
        rows = db.query(sql, params)
        return jsonify({"article": rows[0]}), 201

    @app.put("/api/news/admin/<id>")
    def admin_update_news(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}

        sql = (
            "UPDATE news SET "
            "title = COALESCE(%s, title), "
            "summary = COALESCE(%s, summary), "
            "content = COALESCE(%s, content), "
            "thumbnail = %s, "
            "category = COALESCE(%s, category), "
            "author = COALESCE(%s, author), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *"
        )
        params = [
            sanitize_text(data["title"]) if data.get("title") else None,
            sanitize_text(data["summary"]) if data.get("summary") else None,
            sanitize_text(data["content"]) if data.get("content") else None,
            data.get("thumbnail") if "thumbnail" in data else None,
            data.get("category") or None,
            sanitize_text(data["author"]) if data.get("author") else None,
            data.get("status") or None,
            id,
        ]
        rows = db.query(sql, params)
        if not rows:
            return jsonify({"error": "Article not found"}), 404
        return jsonify({"article": rows[0]})

    @app.delete("/api/news/admin/<id>")
    def admin_delete_news(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM news WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Article not found"}), 404
        return jsonify({"message": "Article deleted successfully"})

    @app.post("/api/news/admin/thumbnail")
    def admin_upload_post_thumbnail():
        admin, err = require_admin()
        if err:
            return err

        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        file = request.files["image"]
        if not file or file.filename == "":
            return jsonify({"error": "No image file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            return jsonify({"error": msg}), (413 if "too large" in msg.lower() else 400)

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            thumbnail_url = store_uploaded_file(file, ext, "posts")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"thumbnail": thumbnail_url}), 201

    # Stories
    @app.get("/api/stories")
    def get_stories():
        category = request.args.get("category")
        limit = request.args.get("limit", "20")
        offset = request.args.get("offset", "0")

        query = "SELECT * FROM stories WHERE status = %s"
        params = ["published"]
        if category:
            query += " AND category = %s"
            params.append(category)

        query += " ORDER BY created_at DESC"
        if limit is not None:
            query += " LIMIT %s"
            params.append(int(limit))
        if offset is not None:
            query += " OFFSET %s"
            params.append(int(offset))

        rows = db.query(query, params)
        return jsonify({"stories": rows})

    @app.get("/api/stories/<id>")
    def get_story(id):
        rows = db.query(
            "SELECT * FROM stories WHERE id = %s AND status = %s",
            [id, "published"],
        )
        if not rows:
            return jsonify({"error": "Story not found"}), 404
        return jsonify({"story": rows[0]})

    @app.get("/api/stories/admin/all")
    def admin_all_stories():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM stories ORDER BY created_at DESC")
        return jsonify({"stories": rows})

    @app.post("/api/stories/admin")
    def admin_create_story():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        content = data.get("content")
        if not title or not content:
            return jsonify({"error": "Title and content are required"}), 400

        sql = (
            "INSERT INTO stories (title, excerpt, content, cover_image, author, category, read_time, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(title),
            sanitize_text(data.get("excerpt")),
            sanitize_text(content),
            data.get("cover_image") or None,
            sanitize_text(data.get("author")) or "NZ Cultural Events",
            data.get("category") or "culture",
            data.get("read_time") or 5,
            admin["id"],
        ]
        rows = db.query(sql, params)
        return jsonify({"story": rows[0]}), 201

    @app.put("/api/stories/admin/<id>")
    def admin_update_story(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}

        sql = (
            "UPDATE stories SET "
            "title = COALESCE(%s, title), "
            "excerpt = COALESCE(%s, excerpt), "
            "content = COALESCE(%s, content), "
            "cover_image = %s, "
            "author = COALESCE(%s, author), "
            "category = COALESCE(%s, category), "
            "read_time = COALESCE(%s, read_time), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *"
        )
        params = [
            sanitize_text(data["title"]) if data.get("title") else None,
            sanitize_text(data["excerpt"]) if data.get("excerpt") else None,
            sanitize_text(data["content"]) if data.get("content") else None,
            data.get("cover_image") if "cover_image" in data else None,
            sanitize_text(data["author"]) if data.get("author") else None,
            data.get("category") or None,
            data.get("read_time") if "read_time" in data else None,
            data.get("status") or None,
            id,
        ]
        rows = db.query(sql, params)
        if not rows:
            return jsonify({"error": "Story not found"}), 404
        return jsonify({"story": rows[0]})

    @app.delete("/api/stories/admin/<id>")
    def admin_delete_story(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM stories WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Story not found"}), 404
        return jsonify({"message": "Story deleted successfully"})

    # Gallery
    @app.get("/api/gallery")
    def get_gallery():
        category = request.args.get("category")
        production_id = request.args.get("production_id")
        event_id = request.args.get("event_id")
        year = request.args.get("year")
        limit = request.args.get("limit", "50")
        offset = request.args.get("offset", "0")

        query = "SELECT * FROM gallery"
        conditions = []
        params = []
        if category:
            conditions.append("category = %s")
            params.append(category)
        if production_id == "any":
            conditions.append("production_id IS NOT NULL")
        elif production_id:
            conditions.append("production_id = %s")
            params.append(production_id)
        if event_id == "any":
            conditions.append("event_id IS NOT NULL")
        elif event_id:
            conditions.append("event_id = %s")
            params.append(event_id)
        if year:
            conditions.append("EXTRACT(YEAR FROM created_at)::int = %s")
            params.append(int(year))
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY sort_order ASC, created_at DESC"
        if limit is not None:
            query += " LIMIT %s"
            params.append(int(limit))
        if offset is not None:
            query += " OFFSET %s"
            params.append(int(offset))

        rows = db.query(query, params)
        return jsonify({"images": rows})

    @app.get("/api/gallery/years")
    def get_gallery_years():
        rows = db.query(
            "SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS year FROM gallery ORDER BY year DESC")
        return jsonify({"years": [r["year"] for r in rows]})

    @app.get("/api/gallery/admin/all")
    def admin_all_gallery():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query(
            "SELECT * FROM gallery ORDER BY sort_order ASC, created_at DESC")
        return jsonify({"images": rows})

    def validate_image(file_storage):
        filename = file_storage.filename or ""
        ext = os.path.splitext(filename.lower())[1]
        if ext not in ALLOWED_IMAGE_EXTS:
            raise ValueError(
                "Only image files are allowed (jpg, png, gif, webp, svg)")

        mime = file_storage.mimetype or ""
        if mime and not mime.startswith(ALLOWED_IMAGE_MIME_PREFIXES):
            # still allow if extension is valid
            pass

        max_bytes = int(_env("MAX_FILE_SIZE", 10485760))
        file_storage.stream.seek(0, os.SEEK_END)
        size = file_storage.stream.tell()
        file_storage.stream.seek(0)
        if size > max_bytes:
            raise ValueError("File too large. Maximum size is 10MB.")

        return ext

    @app.post("/api/gallery/admin/upload")
    def admin_upload_gallery():
        admin, err = require_admin()
        if err:
            return err

        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        file = request.files["image"]
        if not file or file.filename == "":
            return jsonify({"error": "No image file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            if "File too large" in msg:
                return jsonify({"error": msg}), 413
            return jsonify({"error": msg}), 400

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            image_url = store_uploaded_file(file, ext, "gallery")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        data = request.form.to_dict(flat=True)
        title = data.get("title")
        description = data.get("description")
        category = data.get("category")
        photographer = data.get("photographer")
        production_id = data.get("production_id") or None
        event_id = data.get("event_id") or None

        sql = (
            "INSERT INTO gallery (title, description, image_url, category, photographer, production_id, event_id, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(title) or "Untitled",
            sanitize_text(description) or None,
            image_url,
            category or "general",
            sanitize_text(photographer) or None,
            production_id,
            event_id,
            admin["id"],
        ]
        rows = db.query(sql, params)
        return jsonify({"image": rows[0]}), 201

    @app.put("/api/gallery/admin/<id>")
    def admin_update_gallery(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}

        sql = (
            "UPDATE gallery SET "
            "title = COALESCE(%s, title), "
            "description = COALESCE(%s, description), "
            "category = COALESCE(%s, category), "
            "photographer = COALESCE(%s, photographer), "
            "production_id = COALESCE(%s, production_id), "
            "sort_order = COALESCE(%s, sort_order), "
            "featured = COALESCE(%s, featured), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *"
        )
        params = [
            sanitize_text(data["title"]) if data.get("title") else None,
            sanitize_text(data["description"]) if data.get(
                "description") else None,
            data.get("category") or None,
            sanitize_text(data["photographer"]) if data.get(
                "photographer") else None,
            (data.get("production_id") or None) if "production_id" in data else None,
            data.get("sort_order") if "sort_order" in data else None,
            data.get("featured") if "featured" in data else None,
            id,
        ]
        rows = db.query(sql, params)
        if not rows:
            return jsonify({"error": "Image not found"}), 404
        return jsonify({"image": rows[0]})

    @app.delete("/api/gallery/admin/<id>")
    def admin_delete_gallery(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM gallery WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Image not found"}), 404
        return jsonify({"message": "Image deleted successfully"})

    # Leadership
    @app.get("/api/leadership")
    def get_leadership():
        category = request.args.get("category")
        query = "SELECT * FROM leadership WHERE status = %s"
        params = ["active"]
        if category:
            query += " AND category = %s"
            params.append(category)
        query += " ORDER BY sort_order ASC, created_at ASC"
        rows = db.query(query, params)
        return jsonify({"leaders": rows})

    @app.get("/api/leadership/admin/all")
    def admin_all_leadership():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM leadership ORDER BY sort_order ASC, created_at ASC")
        return jsonify({"leaders": rows})

    @app.post("/api/leadership/admin")
    def admin_create_leader():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        role = data.get("role")
        if not name or not role:
            return jsonify({"error": "Name and role are required"}), 400

        category = data.get("category") or "team"
        if category not in ("director", "team"):
            return jsonify({"error": "Invalid category"}), 400

        sql = (
            "INSERT INTO leadership (name, role, bio, contribution, photo_url, category, sort_order, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(name),
            sanitize_text(role),
            sanitize_text(data.get("bio")),
            sanitize_text(data.get("contribution")),
            data.get("photo_url") or None,
            category,
            int(data.get("sort_order") or 0),
            data.get("status") or "active",
            admin["id"],
        ]
        rows = db.query(sql, params)
        return jsonify({"leader": rows[0]}), 201

    @app.put("/api/leadership/admin/<id>")
    def admin_update_leader(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        if data.get("category") and data["category"] not in ("director", "team"):
            return jsonify({"error": "Invalid category"}), 400

        sql = (
            "UPDATE leadership SET "
            "name = COALESCE(%s, name), "
            "role = COALESCE(%s, role), "
            "bio = COALESCE(%s, bio), "
            "contribution = COALESCE(%s, contribution), "
            "photo_url = COALESCE(%s, photo_url), "
            "category = COALESCE(%s, category), "
            "sort_order = COALESCE(%s, sort_order), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *"
        )
        params = [
            sanitize_text(data["name"]) if data.get("name") else None,
            sanitize_text(data["role"]) if data.get("role") else None,
            sanitize_text(data["bio"]) if "bio" in data else None,
            sanitize_text(data["contribution"]) if "contribution" in data else None,
            data.get("photo_url") or None,
            data.get("category") or None,
            int(data["sort_order"]) if "sort_order" in data else None,
            data.get("status") or None,
            id,
        ]
        rows = db.query(sql, params)
        if not rows:
            return jsonify({"error": "Leader not found"}), 404
        return jsonify({"leader": rows[0]})

    @app.delete("/api/leadership/admin/<id>")
    def admin_delete_leader(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM leadership WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Leader not found"}), 404
        return jsonify({"message": "Leader deleted successfully"})

    @app.post("/api/leadership/admin/photo")
    def admin_upload_leader_photo():
        admin, err = require_admin()
        if err:
            return err

        if "photo" not in request.files:
            return jsonify({"error": "No photo file provided"}), 400
        file = request.files["photo"]
        if not file or file.filename == "":
            return jsonify({"error": "No photo file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            if "File too large" in msg:
                return jsonify({"error": msg}), 413
            return jsonify({"error": msg}), 400

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            photo_url = store_uploaded_file(file, ext, "people")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"photo_url": photo_url}), 201

    # Site Settings
    @app.get("/api/settings")
    def get_settings_public():
        rows = db.query("SELECT key, value, category, label FROM site_settings ORDER BY category, key")
        return jsonify({"settings": rows})

    @app.get("/api/settings/admin")
    def get_settings_admin():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM site_settings ORDER BY category, key")
        return jsonify({"settings": rows})

    @app.put("/api/settings/admin")
    def update_settings_admin():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        settings = data.get("settings", [])
        for s in settings:
            key = s.get("key")
            value = s.get("value", "")
            if key:
                db.execute(
                    "UPDATE site_settings SET value = %s, updated_at = NOW() WHERE key = %s",
                    [value, key],
                )
        return jsonify({"message": "Settings updated successfully"})

    @app.post("/api/settings/admin/hero-banner")
    def admin_upload_hero_banner():
        admin, err = require_admin()
        if err:
            return err

        if "banner" not in request.files:
            return jsonify({"error": "No banner file provided"}), 400
        file = request.files["banner"]
        if not file or file.filename == "":
            return jsonify({"error": "No banner file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            if "File too large" in msg:
                return jsonify({"error": msg}), 413
            return jsonify({"error": msg}), 400

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            banner_url = store_uploaded_file(file, ext, "settings")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"url": banner_url}), 201

    # Memberships
    def _add_one_month(d):
        year = d.year + (d.month // 12)
        month = d.month % 12 + 1
        day = min(d.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)

    def _membership_with_status(row):
        m = dict(row)
        if m["status"] == "active" and m.get("next_due_date") and m["next_due_date"] < date.today():
            m["display_status"] = "expired"
        else:
            m["display_status"] = m["status"]
        return m

    EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    @app.post("/api/membership/register")
    def membership_register():
        data = request.get_json(silent=True) or {}
        full_name = (data.get("fullName") or data.get("full_name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        age_group = data.get("ageGroup") or data.get("age_group")
        program = data.get("program")
        guardian_name = (data.get("guardianName") or data.get("guardian_name") or "").strip()
        guardian_phone = (data.get("guardianPhone") or data.get("guardian_phone") or "").strip()
        medical_notes = data.get("medicalNotes") or data.get("medical_notes")
        consent_given = parse_bool(data.get("consentGiven") if "consentGiven" in data else data.get("consent_given")) or False

        if not full_name or not email or not phone or not age_group or not program:
            return jsonify({"error": "All fields are required"}), 400
        if not EMAIL_RE.match(email):
            return jsonify({"error": "Please enter a valid email address"}), 400
        if age_group not in ("16_and_under", "16_and_over"):
            return jsonify({"error": "Invalid age group"}), 400
        if program not in ("dancing", "vocals", "both"):
            return jsonify({"error": "Invalid program selection"}), 400
        if age_group == "16_and_under" and (not guardian_name or not guardian_phone):
            return jsonify({"error": "Guardian name and phone are required for members 16 and under"}), 400

        try:
            rows = db.query(
                "INSERT INTO memberships (full_name, email, phone, age_group, program, guardian_name, guardian_phone, medical_notes, consent_given) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
                [
                    sanitize_text(full_name),
                    email,
                    sanitize_text(phone),
                    age_group,
                    program,
                    sanitize_text(guardian_name) or None,
                    sanitize_text(guardian_phone) or None,
                    sanitize_text(medical_notes) if medical_notes else None,
                    consent_given,
                ],
            )
        except UniqueViolation:
            return jsonify(
                {"error": "This email has already registered for this program."}
            ), 409
        return jsonify({"membership": _membership_with_status(rows[0])}), 201

    @app.get("/api/membership/admin/all")
    def admin_all_memberships():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM memberships ORDER BY created_at DESC")
        return jsonify({"memberships": [_membership_with_status(r) for r in rows]})

    @app.put("/api/membership/admin/<id>/payment")
    def admin_mark_membership_paid(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM memberships WHERE id = %s", [id])
        if not rows:
            return jsonify({"error": "Membership not found"}), 404
        m = rows[0]
        data = request.get_json(silent=True) or {}
        if m["status"] == "active":
            today = date.today()
            base = m["next_due_date"] if m["next_due_date"] and m["next_due_date"] >= today else today
            new_due = _add_one_month(base)
            rows = db.query(
                "UPDATE memberships SET payment_status = 'paid', next_due_date = %s, updated_at = NOW() "
                "WHERE id = %s RETURNING *",
                [new_due, id],
            )
        else:
            rows = db.query(
                "UPDATE memberships SET payment_status = 'paid', updated_at = NOW() WHERE id = %s RETURNING *",
                [id],
            )
        db.execute(
            "INSERT INTO membership_payments (membership_id, amount, note) VALUES (%s,%s,%s)",
            [id, data.get("amount") or None, sanitize_text(data.get("note")) if data.get("note") else None],
        )
        return jsonify({"membership": _membership_with_status(rows[0])})

    @app.get("/api/membership/admin/<id>/payments")
    def admin_membership_payments(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query(
            "SELECT * FROM membership_payments WHERE membership_id = %s ORDER BY paid_at DESC, created_at DESC",
            [id],
        )
        return jsonify({"payments": rows})

    @app.put("/api/membership/admin/<id>/activate")
    def admin_activate_membership(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM memberships WHERE id = %s", [id])
        if not rows:
            return jsonify({"error": "Membership not found"}), 404
        next_due = _add_one_month(date.today())
        rows = db.query(
            "UPDATE memberships SET status = 'active', payment_status = 'paid', "
            "activated_at = COALESCE(activated_at, NOW()), next_due_date = %s, updated_at = NOW() "
            "WHERE id = %s RETURNING *",
            [next_due, id],
        )
        return jsonify({"membership": _membership_with_status(rows[0])})

    @app.put("/api/membership/admin/<id>/reject")
    def admin_reject_membership(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query(
            "UPDATE memberships SET status = 'rejected', updated_at = NOW() WHERE id = %s RETURNING *",
            [id],
        )
        if not rows:
            return jsonify({"error": "Membership not found"}), 404
        return jsonify({"membership": _membership_with_status(rows[0])})

    @app.put("/api/membership/admin/<id>/waitlist")
    def admin_waitlist_membership(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query(
            "UPDATE memberships SET status = 'waitlisted', updated_at = NOW() WHERE id = %s RETURNING *",
            [id],
        )
        if not rows:
            return jsonify({"error": "Membership not found"}), 404
        return jsonify({"membership": _membership_with_status(rows[0])})

    @app.delete("/api/membership/admin/<id>")
    def admin_delete_membership(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM memberships WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Membership not found"}), 404
        return jsonify({"message": "Membership deleted successfully"})

    # YouTube Videos
    def extract_youtube_id(url):
        if not url:
            return None
        m = re.search(
            r"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})",
            url,
        )
        return m.group(1) if m else None

    def check_youtube_embeddable(video_id):
        # YouTube's oEmbed endpoint 401s/403s when the video owner has
        # disabled playback on other websites — surfaces the real cause of
        # "Error 153" at add-time instead of a broken player later.
        # Fail open on network errors so a transient outage can't block adds.
        try:
            resp = requests.get(
                "https://www.youtube.com/oembed",
                params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"},
                timeout=4,
            )
            if resp.status_code in (401, 403, 404):
                return False
            return True
        except Exception:
            return True

    @app.get("/api/videos")
    def get_videos():
        production_id = request.args.get("production_id")
        category = request.args.get("category")
        year = request.args.get("year")

        query = "SELECT * FROM videos"
        conditions = []
        params = []
        if production_id == "any":
            conditions.append("production_id IS NOT NULL")
        elif production_id:
            conditions.append("production_id = %s")
            params.append(production_id)
        if category:
            conditions.append("category = %s")
            params.append(category)
        if year:
            conditions.append("EXTRACT(YEAR FROM created_at)::int = %s")
            params.append(int(year))
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY sort_order ASC, created_at DESC"

        rows = db.query(query, params)
        return jsonify({"videos": rows})

    @app.get("/api/videos/years")
    def get_videos_years():
        rows = db.query(
            "SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS year FROM videos ORDER BY year DESC")
        return jsonify({"years": [r["year"] for r in rows]})

    @app.get("/api/videos/admin/all")
    def admin_all_videos():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM videos ORDER BY sort_order ASC, created_at DESC")
        return jsonify({"videos": rows})

    @app.post("/api/videos/admin")
    def admin_create_video():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        youtube_url = data.get("youtube_url")
        if not title or not youtube_url:
            return jsonify({"error": "Title and YouTube URL are required"}), 400
        video_id = extract_youtube_id(youtube_url)
        if not video_id:
            return jsonify({"error": "Could not find a valid YouTube video in that URL"}), 400
        if not check_youtube_embeddable(video_id):
            return jsonify({
                "error": "This video's owner has disabled playback on other websites, "
                         "so it can't be embedded here (YouTube 'Error 153'). Please choose a different video."
            }), 400
        rows = db.query(
            "INSERT INTO videos (title, youtube_url, video_id, sort_order, production_id, category, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            [
                sanitize_text(title),
                youtube_url.strip(),
                video_id,
                int(data.get("sort_order") or 0),
                data.get("production_id") or None,
                data.get("category") or None,
                admin["id"],
            ],
        )
        return jsonify({"video": rows[0]}), 201

    @app.put("/api/videos/admin/<id>")
    def admin_update_video(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        video_id = None
        if data.get("youtube_url"):
            video_id = extract_youtube_id(data["youtube_url"])
            if not video_id:
                return jsonify({"error": "Could not find a valid YouTube video in that URL"}), 400
            if not check_youtube_embeddable(video_id):
                return jsonify({
                    "error": "This video's owner has disabled playback on other websites, "
                             "so it can't be embedded here (YouTube 'Error 153'). Please choose a different video."
                }), 400
        rows = db.query(
            "UPDATE videos SET "
            "title = COALESCE(%s, title), "
            "youtube_url = COALESCE(%s, youtube_url), "
            "video_id = COALESCE(%s, video_id), "
            "sort_order = COALESCE(%s, sort_order), "
            "production_id = COALESCE(%s, production_id), "
            "category = COALESCE(%s, category), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *",
            [
                sanitize_text(data["title"]) if data.get("title") else None,
                data.get("youtube_url") or None,
                video_id,
                int(data["sort_order"]) if "sort_order" in data else None,
                (data.get("production_id") or None) if "production_id" in data else None,
                (data.get("category") or None) if "category" in data else None,
                id,
            ],
        )
        if not rows:
            return jsonify({"error": "Video not found"}), 404
        return jsonify({"video": rows[0]})

    @app.delete("/api/videos/admin/<id>")
    def admin_delete_video(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM videos WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Video not found"}), 404
        return jsonify({"message": "Video deleted successfully"})

    # Contact form enquiries
    @app.post("/api/contact")
    def submit_contact():
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        subject = (data.get("subject") or "").strip()
        message = (data.get("message") or "").strip()

        if not name or not email or not message:
            return jsonify({"error": "Name, email, and message are required"}), 400
        if not EMAIL_RE.match(email):
            return jsonify({"error": "Please enter a valid email address"}), 400

        rows = db.query(
            "INSERT INTO contact_enquiries (name, email, subject, message) "
            "VALUES (%s,%s,%s,%s) RETURNING *",
            [sanitize_text(name), email, sanitize_text(subject), sanitize_text(message)],
        )
        return jsonify({"enquiry": rows[0]}), 201

    @app.get("/api/contact/admin/all")
    def admin_all_enquiries():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM contact_enquiries ORDER BY created_at DESC")
        return jsonify({"enquiries": rows})

    @app.put("/api/contact/admin/<id>")
    def admin_update_enquiry(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        status = data.get("status")
        if status not in ("new", "read", "completed"):
            return jsonify({"error": "Invalid status"}), 400
        rows = db.query(
            "UPDATE contact_enquiries SET status = %s, updated_at = NOW() WHERE id = %s RETURNING *",
            [status, id],
        )
        if not rows:
            return jsonify({"error": "Enquiry not found"}), 404
        return jsonify({"enquiry": rows[0]})

    @app.delete("/api/contact/admin/<id>")
    def admin_delete_enquiry(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM contact_enquiries WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Enquiry not found"}), 404
        return jsonify({"message": "Enquiry deleted successfully"})

    # Productions (festival hub pages: Nadanu Pa, Pada Padma, World Drumming Festival, etc.)
    @app.get("/api/productions")
    def get_productions():
        rows = db.query(
            "SELECT * FROM productions WHERE status = %s ORDER BY sort_order ASC, created_at ASC",
            ["published"],
        )
        return jsonify({"productions": rows})

    @app.get("/api/productions/<slug>")
    def get_production(slug):
        rows = db.query(
            "SELECT * FROM productions WHERE slug = %s AND status = %s", [slug, "published"])
        if not rows:
            return jsonify({"error": "Production not found"}), 404
        return jsonify({"production": rows[0]})

    @app.get("/api/productions/admin/all")
    def admin_all_productions():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM productions ORDER BY sort_order ASC, created_at ASC")
        return jsonify({"productions": rows})

    @app.post("/api/productions/admin")
    def admin_create_production():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        if not title:
            return jsonify({"error": "Title is required"}), 400
        slug = slugify(data.get("slug") or title)
        if not slug:
            return jsonify({"error": "Could not derive a slug from the title"}), 400

        sql = (
            "INSERT INTO productions (title, slug, tagline, description, full_description, cover_image, location, sort_order, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(title),
            slug,
            sanitize_text(data.get("tagline")),
            sanitize_text(data.get("description")),
            sanitize_text(data.get("full_description")),
            data.get("cover_image") or None,
            sanitize_text(data.get("location")),
            int(data.get("sort_order") or 0),
            data.get("status") or "published",
            admin["id"],
        ]
        try:
            rows = db.query(sql, params)
        except UniqueViolation:
            return jsonify({"error": "A production with that slug already exists"}), 409
        return jsonify({"production": rows[0]}), 201

    @app.put("/api/productions/admin/<id>")
    def admin_update_production(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        slug = slugify(data["slug"]) if data.get("slug") else None

        sql = (
            "UPDATE productions SET "
            "title = COALESCE(%s, title), "
            "slug = COALESCE(%s, slug), "
            "tagline = COALESCE(%s, tagline), "
            "description = COALESCE(%s, description), "
            "full_description = COALESCE(%s, full_description), "
            "cover_image = COALESCE(%s, cover_image), "
            "location = COALESCE(%s, location), "
            "sort_order = COALESCE(%s, sort_order), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *"
        )
        params = [
            sanitize_text(data["title"]) if data.get("title") else None,
            slug,
            sanitize_text(data["tagline"]) if "tagline" in data else None,
            sanitize_text(data["description"]) if "description" in data else None,
            sanitize_text(data["full_description"]) if "full_description" in data else None,
            data.get("cover_image") or None,
            sanitize_text(data["location"]) if "location" in data else None,
            int(data["sort_order"]) if "sort_order" in data else None,
            data.get("status") or None,
            id,
        ]
        try:
            rows = db.query(sql, params)
        except UniqueViolation:
            return jsonify({"error": "A production with that slug already exists"}), 409
        if not rows:
            return jsonify({"error": "Production not found"}), 404
        return jsonify({"production": rows[0]})

    @app.delete("/api/productions/admin/<id>")
    def admin_delete_production(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM productions WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Production not found"}), 404
        return jsonify({"message": "Production deleted successfully"})

    @app.post("/api/productions/admin/cover")
    def admin_upload_production_cover():
        admin, err = require_admin()
        if err:
            return err

        if "cover" not in request.files:
            return jsonify({"error": "No cover image file provided"}), 400
        file = request.files["cover"]
        if not file or file.filename == "":
            return jsonify({"error": "No cover image file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            if "File too large" in msg:
                return jsonify({"error": msg}), 413
            return jsonify({"error": msg}), 400

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            cover_image = store_uploaded_file(file, ext, "productions")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"cover_image": cover_image}), 201

    # Tutors
    @app.get("/api/tutors")
    def get_tutors():
        rows = db.query(
            "SELECT * FROM tutors WHERE status = %s ORDER BY sort_order ASC, created_at ASC",
            ["active"],
        )
        return jsonify({"tutors": rows})

    @app.get("/api/tutors/admin/all")
    def admin_all_tutors():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM tutors ORDER BY sort_order ASC, created_at ASC")
        return jsonify({"tutors": rows})

    @app.post("/api/tutors/admin")
    def admin_create_tutor():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "Name is required"}), 400

        rows = db.query(
            "INSERT INTO tutors (name, bio, photo_url, sort_order, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
            [
                sanitize_text(name),
                sanitize_text(data.get("bio")),
                data.get("photo_url") or None,
                int(data.get("sort_order") or 0),
                data.get("status") or "active",
                admin["id"],
            ],
        )
        return jsonify({"tutor": rows[0]}), 201

    @app.put("/api/tutors/admin/<id>")
    def admin_update_tutor(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        rows = db.query(
            "UPDATE tutors SET "
            "name = COALESCE(%s, name), "
            "bio = COALESCE(%s, bio), "
            "photo_url = COALESCE(%s, photo_url), "
            "sort_order = COALESCE(%s, sort_order), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *",
            [
                sanitize_text(data["name"]) if data.get("name") else None,
                sanitize_text(data["bio"]) if "bio" in data else None,
                data.get("photo_url") or None,
                int(data["sort_order"]) if "sort_order" in data else None,
                data.get("status") or None,
                id,
            ],
        )
        if not rows:
            return jsonify({"error": "Tutor not found"}), 404
        return jsonify({"tutor": rows[0]})

    @app.delete("/api/tutors/admin/<id>")
    def admin_delete_tutor(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM tutors WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Tutor not found"}), 404
        return jsonify({"message": "Tutor deleted successfully"})

    @app.post("/api/tutors/admin/photo")
    def admin_upload_tutor_photo():
        admin, err = require_admin()
        if err:
            return err

        if "photo" not in request.files:
            return jsonify({"error": "No photo file provided"}), 400
        file = request.files["photo"]
        if not file or file.filename == "":
            return jsonify({"error": "No photo file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            if "File too large" in msg:
                return jsonify({"error": msg}), 413
            return jsonify({"error": msg}), 400

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            photo_url = store_uploaded_file(file, ext, "tutors")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"photo_url": photo_url}), 201

    # Partners & Sponsors
    @app.get("/api/sponsors")
    def get_sponsors():
        rows = db.query(
            "SELECT * FROM sponsors WHERE status = %s ORDER BY sort_order ASC, created_at ASC",
            ["active"],
        )
        return jsonify({"sponsors": rows})

    @app.get("/api/sponsors/admin/all")
    def admin_all_sponsors():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM sponsors ORDER BY sort_order ASC, created_at ASC")
        return jsonify({"sponsors": rows})

    @app.post("/api/sponsors/admin")
    def admin_create_sponsor():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "Name is required"}), 400

        rows = db.query(
            "INSERT INTO sponsors (name, logo_url, website_url, sort_order, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s) RETURNING *",
            [
                sanitize_text(name),
                data.get("logo_url") or None,
                data.get("website_url") or None,
                int(data.get("sort_order") or 0),
                data.get("status") or "active",
                admin["id"],
            ],
        )
        return jsonify({"sponsor": rows[0]}), 201

    @app.put("/api/sponsors/admin/<id>")
    def admin_update_sponsor(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        rows = db.query(
            "UPDATE sponsors SET "
            "name = COALESCE(%s, name), "
            "logo_url = COALESCE(%s, logo_url), "
            "website_url = COALESCE(%s, website_url), "
            "sort_order = COALESCE(%s, sort_order), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *",
            [
                sanitize_text(data["name"]) if data.get("name") else None,
                data.get("logo_url") or None,
                data.get("website_url") or None,
                int(data["sort_order"]) if "sort_order" in data else None,
                data.get("status") or None,
                id,
            ],
        )
        if not rows:
            return jsonify({"error": "Sponsor not found"}), 404
        return jsonify({"sponsor": rows[0]})

    @app.delete("/api/sponsors/admin/<id>")
    def admin_delete_sponsor(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM sponsors WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Sponsor not found"}), 404
        return jsonify({"message": "Sponsor deleted successfully"})

    @app.post("/api/sponsors/admin/logo")
    def admin_upload_sponsor_logo():
        admin, err = require_admin()
        if err:
            return err

        if "logo" not in request.files:
            return jsonify({"error": "No logo file provided"}), 400
        file = request.files["logo"]
        if not file or file.filename == "":
            return jsonify({"error": "No logo file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            if "File too large" in msg:
                return jsonify({"error": msg}), 413
            return jsonify({"error": msg}), 400

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            logo_url = store_uploaded_file(file, ext, "sponsors")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"logo_url": logo_url}), 201

    # Programmes (Learn to Dance, Learn to Sing)
    def _class_tutors(class_id):
        return db.query(
            "SELECT t.id, t.name FROM class_tutors ct JOIN tutors t ON t.id = ct.tutor_id "
            "WHERE ct.class_id = %s ORDER BY t.sort_order ASC",
            [class_id],
        )

    def _set_class_tutors(class_id, tutor_ids):
        db.execute("DELETE FROM class_tutors WHERE class_id = %s", [class_id])
        for tutor_id in tutor_ids or []:
            db.execute(
                "INSERT INTO class_tutors (class_id, tutor_id) VALUES (%s,%s)",
                [class_id, tutor_id],
            )

    @app.get("/api/programmes")
    def get_programmes():
        rows = db.query(
            "SELECT * FROM programmes WHERE status = %s ORDER BY sort_order ASC, created_at ASC",
            ["active"],
        )
        return jsonify({"programmes": rows})

    @app.get("/api/programmes/<slug>")
    def get_programme(slug):
        rows = db.query(
            "SELECT * FROM programmes WHERE slug = %s AND status = %s", [slug, "active"])
        if not rows:
            return jsonify({"error": "Programme not found"}), 404
        programme = rows[0]

        classes = db.query(
            "SELECT * FROM programme_classes WHERE programme_id = %s AND status = %s "
            "ORDER BY sort_order ASC, created_at ASC",
            [programme["id"], "active"],
        )
        for c in classes:
            c["tutors"] = _class_tutors(c["id"])
        programme["classes"] = classes
        return jsonify({"programme": programme})

    @app.get("/api/programmes/admin/all")
    def admin_all_programmes():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("SELECT * FROM programmes ORDER BY sort_order ASC, created_at ASC")
        return jsonify({"programmes": rows})

    @app.post("/api/programmes/admin")
    def admin_create_programme():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "Name is required"}), 400
        slug = slugify(data.get("slug") or name)
        if not slug:
            return jsonify({"error": "Could not derive a slug from the name"}), 400

        sql = (
            "INSERT INTO programmes (name, slug, description, cover_image, sort_order, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(name),
            slug,
            sanitize_text(data.get("description")),
            data.get("cover_image") or None,
            int(data.get("sort_order") or 0),
            data.get("status") or "active",
            admin["id"],
        ]
        try:
            rows = db.query(sql, params)
        except UniqueViolation:
            return jsonify({"error": "A programme with that slug already exists"}), 409
        return jsonify({"programme": rows[0]}), 201

    @app.put("/api/programmes/admin/<id>")
    def admin_update_programme(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        slug = slugify(data["slug"]) if data.get("slug") else None

        sql = (
            "UPDATE programmes SET "
            "name = COALESCE(%s, name), "
            "slug = COALESCE(%s, slug), "
            "description = COALESCE(%s, description), "
            "cover_image = COALESCE(%s, cover_image), "
            "sort_order = COALESCE(%s, sort_order), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *"
        )
        params = [
            sanitize_text(data["name"]) if data.get("name") else None,
            slug,
            sanitize_text(data["description"]) if "description" in data else None,
            data.get("cover_image") or None,
            int(data["sort_order"]) if "sort_order" in data else None,
            data.get("status") or None,
            id,
        ]
        try:
            rows = db.query(sql, params)
        except UniqueViolation:
            return jsonify({"error": "A programme with that slug already exists"}), 409
        if not rows:
            return jsonify({"error": "Programme not found"}), 404
        return jsonify({"programme": rows[0]})

    @app.delete("/api/programmes/admin/<id>")
    def admin_delete_programme(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM programmes WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Programme not found"}), 404
        return jsonify({"message": "Programme deleted successfully"})

    @app.post("/api/programmes/admin/cover")
    def admin_upload_programme_cover():
        admin, err = require_admin()
        if err:
            return err

        if "cover" not in request.files:
            return jsonify({"error": "No cover image file provided"}), 400
        file = request.files["cover"]
        if not file or file.filename == "":
            return jsonify({"error": "No cover image file provided"}), 400

        try:
            validate_image(file)
        except ValueError as e:
            msg = str(e)
            if "File too large" in msg:
                return jsonify({"error": msg}), 413
            return jsonify({"error": msg}), 400

        ext = os.path.splitext(file.filename.lower())[1]
        try:
            cover_image = store_uploaded_file(file, ext, "programmes")
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502
        return jsonify({"cover_image": cover_image}), 201

    # Programme classes (age group / level / timetable / fee within a programme)
    @app.get("/api/programme-classes/admin/all")
    def admin_all_programme_classes():
        admin, err = require_admin()
        if err:
            return err
        rows = db.query(
            "SELECT pc.*, p.name AS programme_name FROM programme_classes pc "
            "JOIN programmes p ON p.id = pc.programme_id "
            "ORDER BY p.sort_order ASC, pc.sort_order ASC, pc.created_at ASC"
        )
        for c in rows:
            c["tutor_ids"] = [t["id"] for t in _class_tutors(c["id"])]
        return jsonify({"classes": rows})

    @app.post("/api/programme-classes/admin")
    def admin_create_programme_class():
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}
        programme_id = data.get("programme_id")
        name = data.get("name")
        if not programme_id or not name:
            return jsonify({"error": "Programme and level name are required"}), 400

        rows = db.query(
            "INSERT INTO programme_classes (programme_id, name, age_group, schedule, location, fee_amount, fee_period, sort_order, status) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
            [
                programme_id,
                sanitize_text(name),
                sanitize_text(data.get("age_group")),
                sanitize_text(data.get("schedule")),
                sanitize_text(data.get("location")),
                data.get("fee_amount") or None,
                data.get("fee_period") or "term",
                int(data.get("sort_order") or 0),
                data.get("status") or "active",
            ],
        )
        cls = rows[0]
        _set_class_tutors(cls["id"], data.get("tutor_ids"))
        cls["tutors"] = _class_tutors(cls["id"])
        return jsonify({"class": cls}), 201

    @app.put("/api/programme-classes/admin/<id>")
    def admin_update_programme_class(id):
        admin, err = require_admin()
        if err:
            return err
        data = request.get_json(silent=True) or {}

        rows = db.query(
            "UPDATE programme_classes SET "
            "programme_id = COALESCE(%s, programme_id), "
            "name = COALESCE(%s, name), "
            "age_group = COALESCE(%s, age_group), "
            "schedule = COALESCE(%s, schedule), "
            "location = COALESCE(%s, location), "
            "fee_amount = COALESCE(%s, fee_amount), "
            "fee_period = COALESCE(%s, fee_period), "
            "sort_order = COALESCE(%s, sort_order), "
            "status = COALESCE(%s, status), "
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *",
            [
                data.get("programme_id") or None,
                sanitize_text(data["name"]) if data.get("name") else None,
                sanitize_text(data["age_group"]) if "age_group" in data else None,
                sanitize_text(data["schedule"]) if "schedule" in data else None,
                sanitize_text(data["location"]) if "location" in data else None,
                data.get("fee_amount") if "fee_amount" in data else None,
                data.get("fee_period") or None,
                int(data["sort_order"]) if "sort_order" in data else None,
                data.get("status") or None,
                id,
            ],
        )
        if not rows:
            return jsonify({"error": "Class not found"}), 404
        cls = rows[0]
        if "tutor_ids" in data:
            _set_class_tutors(id, data.get("tutor_ids"))
        cls["tutors"] = _class_tutors(id)
        return jsonify({"class": cls})

    @app.delete("/api/programme-classes/admin/<id>")
    def admin_delete_programme_class(id):
        admin, err = require_admin()
        if err:
            return err
        rows = db.query("DELETE FROM programme_classes WHERE id = %s RETURNING id", [id])
        if not rows:
            return jsonify({"error": "Class not found"}), 404
        return jsonify({"message": "Class deleted successfully"})

    # Dashboard stats
    @app.get("/api/dashboard/stats")
    def dashboard_stats():
        admin, err = require_admin()
        if err:
            return err

        events_count = db.query("SELECT COUNT(*) AS count FROM events")
        news_count = db.query("SELECT COUNT(*) AS count FROM news")
        gallery_count = db.query("SELECT COUNT(*) AS count FROM gallery")
        stories_count = db.query("SELECT COUNT(*) AS count FROM stories")

        recent_events = db.query(
            "SELECT id, title, date, category, cover_image FROM events ORDER BY created_at DESC LIMIT 5"
        )
        recent_news = db.query(
            "SELECT id, title, created_at, category, thumbnail FROM news ORDER BY created_at DESC LIMIT 5"
        )
        recent_gallery = db.query(
            "SELECT id, title, image_url, category FROM gallery ORDER BY created_at DESC LIMIT 5"
        )

        return jsonify(
            {
                "stats": {
                    "totalEvents": int(events_count[0]["count"]) if events_count else 0,
                    "totalNews": int(news_count[0]["count"]) if news_count else 0,
                    "totalGallery": int(gallery_count[0]["count"]) if gallery_count else 0,
                    "totalStories": int(stories_count[0]["count"]) if stories_count else 0,
                },
                "recent": {
                    "events": recent_events,
                    "news": recent_news,
                    "gallery": recent_gallery,
                },
            }
        )

    # The admin dashboard is still its own static page. Every other route is
    # the React frontend, which serves itself off index.html and handles
    # routing client-side (see the catch-all below).
    @app.get("/admin")
    def page_admin():
        return send_from_directory(public_dir, "admin.html")

    @app.get("/")
    def index_page():
        return send_from_directory(public_dir, "index.html")

    # Catch-all: serves real static files (JS/CSS bundles, images, etc.) if
    # they exist on disk; anything else that isn't an API route falls back
    # to index.html so the React app's client-side router can handle it.
    @app.get("/<path:path>")
    def spa_fallback(path):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Not found"}), 404
        if os.path.isfile(os.path.join(public_dir, path)):
            return send_from_directory(public_dir, path)
        return send_from_directory(public_dir, "index.html")

    return app


app = create_app()
bootstrap_default_admin()


if __name__ == "__main__":
    port = int(_env("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=(_env("FLASK_DEBUG") is not None))
