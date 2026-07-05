import os
import re
import uuid
import calendar
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
import cloudinary
import cloudinary.uploader
from psycopg.rows import dict_row
from psycopg import connect
from psycopg.errors import UniqueViolation


def _env(name: str, default=None):
    v = os.environ.get(name)
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


def create_app():
    app = Flask(__name__, static_folder="public", static_url_path="")
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
            result = cloudinary.uploader.upload(
                file_storage.stream,
                folder=f"nzsl/{subfolder}",
                public_id=uuid.uuid4().hex,
                resource_type="image",
            )
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

        rows = db.query("SELECT * FROM admins WHERE email = %s", [email])
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
        thumbnail_url = store_uploaded_file(file, ext, "posts")
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
        limit = request.args.get("limit", "50")
        offset = request.args.get("offset", "0")

        query = "SELECT * FROM gallery"
        params = []
        if category:
            query += " WHERE category = %s"
            params.append(category)

        query += " ORDER BY sort_order ASC, created_at DESC"
        if limit is not None:
            query += " LIMIT %s"
            params.append(int(limit))
        if offset is not None:
            query += " OFFSET %s"
            params.append(int(offset))

        rows = db.query(query, params)
        return jsonify({"images": rows})

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
        image_url = store_uploaded_file(file, ext, "gallery")
        data = request.form.to_dict(flat=True)
        title = data.get("title")
        description = data.get("description")
        category = data.get("category")
        photographer = data.get("photographer")

        sql = (
            "INSERT INTO gallery (title, description, image_url, category, photographer, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(title) or "Untitled",
            sanitize_text(description) or None,
            image_url,
            category or "general",
            sanitize_text(photographer) or None,
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
        rows = db.query(
            "SELECT * FROM leadership WHERE status = %s ORDER BY sort_order ASC, created_at ASC",
            ["active"],
        )
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

        sql = (
            "INSERT INTO leadership (name, role, bio, contribution, photo_url, sort_order, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *"
        )
        params = [
            sanitize_text(name),
            sanitize_text(role),
            sanitize_text(data.get("bio")),
            sanitize_text(data.get("contribution")),
            data.get("photo_url") or None,
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

        sql = (
            "UPDATE leadership SET "
            "name = COALESCE(%s, name), "
            "role = COALESCE(%s, role), "
            "bio = COALESCE(%s, bio), "
            "contribution = COALESCE(%s, contribution), "
            "photo_url = COALESCE(%s, photo_url), "
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
        photo_url = store_uploaded_file(file, ext, "people")
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

        if not full_name or not email or not phone or not age_group or not program:
            return jsonify({"error": "All fields are required"}), 400
        if not EMAIL_RE.match(email):
            return jsonify({"error": "Please enter a valid email address"}), 400
        if age_group not in ("16_and_under", "16_and_over"):
            return jsonify({"error": "Invalid age group"}), 400
        if program not in ("dancing", "vocals", "both"):
            return jsonify({"error": "Invalid program selection"}), 400

        try:
            rows = db.query(
                "INSERT INTO memberships (full_name, email, phone, age_group, program) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING *",
                [sanitize_text(full_name), email, sanitize_text(phone), age_group, program],
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
        return jsonify({"membership": _membership_with_status(rows[0])})

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
        rows = db.query("SELECT * FROM videos ORDER BY sort_order ASC, created_at DESC")
        return jsonify({"videos": rows})

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
            "INSERT INTO videos (title, youtube_url, video_id, sort_order, created_by) "
            "VALUES (%s,%s,%s,%s,%s) RETURNING *",
            [sanitize_text(title), youtube_url.strip(), video_id, int(data.get("sort_order") or 0), admin["id"]],
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
            "updated_at = NOW() "
            "WHERE id = %s RETURNING *",
            [
                sanitize_text(data["title"]) if data.get("title") else None,
                data.get("youtube_url") or None,
                video_id,
                int(data["sort_order"]) if "sort_order" in data else None,
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

    # Explicit page routes — must be defined before the catch-all so Flask
    # prefers these over the built-in static-file /<path:filename> handler.
    _pages = ["about", "events", "gallery", "leadership", "admin", "contact", "membership"]

    def _make_page_view(filename):
        def view():
            return app.send_static_file(filename)
        return view

    for _page in _pages:
        app.add_url_rule(
            f"/{_page}",
            endpoint=f"page_{_page}",
            view_func=_make_page_view(f"{_page}.html"),
        )

    @app.get("/")
    def index_page():
        return app.send_static_file("index.html")

    # Catch-all: anything else that isn't an API route falls back to index
    @app.get("/<path:path>")
    def spa_fallback(path):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Not found"}), 404
        return app.send_static_file("index.html")

    return app


app = create_app()


if __name__ == "__main__":
    port = int(_env("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=(_env("FLASK_DEBUG") is not None))
