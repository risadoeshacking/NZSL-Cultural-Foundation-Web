"""Run scripts/migrate.sql against the configured database."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app import db

sql_path = os.path.join(os.path.dirname(__file__), "migrate.sql")
with open(sql_path) as f:
    sql = f.read()

# Strip comment lines, split on ; and run each non-empty statement
import re
sql_no_comments = re.sub(r"--[^\n]*", "", sql)
statements = [s.strip() for s in sql_no_comments.split(";") if s.strip()]
for stmt in statements:
    try:
        db.execute(stmt)
        print("OK: " + stmt[:80].replace("\n", " ") + "...")
    except Exception as e:
        print("ERROR: " + str(e))

print("\nMigration complete.")
