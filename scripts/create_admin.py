"""Create (or reset the password for) an admin login.

Run this once against whichever database DATABASE_URL points at — locally
for dev, or with DATABASE_URL temporarily set to your Neon connection string
to create the first real production admin.

Usage:
  python3 scripts/create_admin.py
"""
import os
import sys
import uuid
import getpass

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

import bcrypt
from app import db

email = input("Admin email: ").strip().lower()
name = input("Admin name: ").strip()
password = getpass.getpass("Admin password: ")
confirm = getpass.getpass("Confirm password: ")

if not email or not name or not password:
    print("Email, name, and password are all required.")
    sys.exit(1)
if password != confirm:
    print("Passwords did not match.")
    sys.exit(1)

password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

db.execute(
    "INSERT INTO admins (id, email, name, password_hash, role) VALUES (%s,%s,%s,%s,%s) "
    "ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, updated_at = NOW()",
    [str(uuid.uuid4()), email, name, password_hash, "admin"],
)

print(f"\nDone — {email} can now log in at /admin.")
