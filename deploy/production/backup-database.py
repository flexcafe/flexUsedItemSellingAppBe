#!/usr/bin/python3
"""Fail-closed pre-migration PostgreSQL backup without credentials in argv/logs."""
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit, parse_qs

if len(sys.argv) != 2 or not re.fullmatch(r"[A-Za-z0-9-]+", sys.argv[1]):
    sys.exit("Usage: flex-backup-database BACKUP_ID")
values = {}
for line in Path("/opt/flex/shared/.env").read_text().splitlines():
    if line.strip() and not line.lstrip().startswith("#") and "=" in line:
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
url = urlsplit(values.get("DIRECT_URL") or values["DATABASE_URL"])
env = os.environ.copy()
env.update(PGHOST=url.hostname, PGPORT=str(url.port or 5432),
           PGUSER=unquote(url.username or "postgres"), PGDATABASE=unquote(url.path.lstrip("/")),
           PGSSLMODE=parse_qs(url.query).get("sslmode", ["require"])[0], PGCONNECT_TIMEOUT="30")
destination = Path("/opt/flex/backups") / (sys.argv[1] + ".dump")
partial = destination.with_suffix(".dump.partial")
os.umask(0o077)
with tempfile.NamedTemporaryFile(mode="w", prefix="flex-pgpass-", delete=True) as password_file:
    escape = lambda value: value.replace("\\", "\\\\").replace(":", "\\:")
    password_file.write(":".join(escape(value) for value in
        [env["PGHOST"], env["PGPORT"], env["PGDATABASE"], env["PGUSER"], unquote(url.password or "")]) + "\n")
    password_file.flush()
    env["PGPASSFILE"] = password_file.name
    try:
        subprocess.run(["/opt/postgresql/bin/pg_dump", "--format=custom", "--no-owner", "--no-acl",
                        "--file", str(partial)], env=env, check=True, timeout=900)
        subprocess.run(["/opt/postgresql/bin/pg_restore", "--list", str(partial)],
                       check=True, stdout=subprocess.DEVNULL, timeout=60)
        if partial.stat().st_size < 100:
            sys.exit("Database backup is unexpectedly small; deployment blocked.")
        partial.replace(destination)
        print("Verified database backup:", destination.name, destination.stat().st_size, "bytes")
    finally:
        partial.unlink(missing_ok=True)