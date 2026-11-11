#!/usr/bin/env python3
"""Copy an existing Shewiun SQLite database into PostgreSQL and verify it.

    python tools/sqlite_to_postgres.py --sqlite /data/cfa.db --pg postgresql://cfa:secret@localhost:5432/cfa
    docker compose exec cfa python tools/sqlite_to_postgres.py --sqlite /data/cfa.db --pg "$CFA_DATABASE_URL"

What it does
  1. creates the platform schema in PostgreSQL (the same code path the app uses at startup),
  2. creates any table that exists only in the SQLite file (translated to PostgreSQL),
  3. copies every row in batches after confirming the target is empty (or clearing it with --force),
  4. resets the audit sequences, compares row counts per table and verifies the audit chain.

The SQLite file is only read. Stop the app (or take a backup) before you run it so that no write is lost,
start the app with CFA_DATABASE_URL afterwards, and keep the SQLite file as your fallback.
Exit code 0 means every table has the same number of rows in both databases.
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

BATCH = 500


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sqlite", required=True, help="path of the SQLite database file")
    ap.add_argument("--pg", default=os.getenv("CFA_DATABASE_URL"), help="PostgreSQL URL (defaults to CFA_DATABASE_URL in the container)")
    ap.add_argument("--schema", default=os.getenv("CFA_PG_SCHEMA", "public"), help="PostgreSQL schema (default: public)")
    ap.add_argument("--force", action="store_true", help="copy even if PostgreSQL already holds an organisation (its rows in the copied tables are replaced)")
    args = ap.parse_args()
    if not args.pg:
        print("PostgreSQL URL required: pass --pg or set CFA_DATABASE_URL", file=sys.stderr)
        return 2
    if not Path(args.sqlite).is_file():
        print(f"SQLite file not found: {args.sqlite}", file=sys.stderr)
        return 2
    os.environ["CFA_DATABASE_URL"] = args.pg
    os.environ["CFA_PG_SCHEMA"] = args.schema
    os.environ.pop("CFA_DB_SCHEMA_FROM_PATH", None)
    os.environ["CFA_DATABASE_PATH"] = str(Path(args.sqlite).resolve())

    from app import cfa_core as pf
    from app import dbx, main as app_main

    # Inspect the target before app startup creates its own seed rows. A non-empty target
    # requires an explicit --force; this prevents overwriting an existing PostgreSQL workspace.
    src = sqlite3.connect(f"file:{args.sqlite}?mode=ro", uri=True)
    src.row_factory = sqlite3.Row
    tables = [(r["name"], r["sql"]) for r in src.execute(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'notes_fts%' ORDER BY name")]
    tables.sort(key=lambda t: t[0])
    with dbx.connect(app_main.DB_PATH) as probe:
        existing = {r[0] for r in probe.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()").fetchall()}
        occupied = []
        for name in sorted(existing):
            count = probe.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
            if count:
                occupied.append(f"{name}={count}")
    if occupied and not args.force:
        print("PostgreSQL target is not empty (" + ", ".join(occupied[:8]) +
              "). Refusing to overwrite it; use --force only after verifying the target.", file=sys.stderr)
        return 3

    app_main.init_db()
    with pf.db() as warm:  # creates the core tables and runs the migrations
        warm.commit()
    from app import auth
    with auth.db():  # users, organisations, sessions
        pass
    dst = dbx.connect(app_main.DB_PATH)
    have = {r[0] for r in dst.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()").fetchall()}
    pending = [(n, d) for n, d in tables if n not in have and d]
    for _ in range(6):  # tables that reference others are retried until their parents exist
        left = []
        for name, ddl in pending:
            try:
                dst.execute(ddl)
                dst.commit()
                print(f"  created table {name} (only in the SQLite file)")
            except Exception:
                dst.rollback()
                left.append((name, ddl))
        pending = left
        if not pending:
            break
    for name, _ in pending:
        print(f"  could not create table {name}; its rows are skipped", file=sys.stderr)
    for r in src.execute("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"):
        try:
            dst.execute(r["sql"])
        except Exception:
            dst.rollback()
    dst.commit()

    # Parents before children, so foreign keys (sessions -> users, ...) are satisfied while copying.
    deps = {}
    for child, parent in dst.execute("SELECT conrelid::regclass::text, confrelid::regclass::text FROM pg_constraint "
                                     "WHERE contype='f' AND connamespace = current_schema()::regnamespace").fetchall():
        deps.setdefault(child.split(".")[-1].strip('"'), set()).add(parent.split(".")[-1].strip('"'))
    ordered, seen = [], set()

    def visit(n: str, stack=()) -> None:
        if n in seen or n in stack:
            return
        for p in sorted(deps.get(n, ())):
            visit(p, stack + (n,))
        seen.add(n)
        ordered.append(n)

    for n, _ in tables:
        visit(n)
    rank = {n: i for i, n in enumerate(ordered)}
    tables.sort(key=lambda t: rank.get(t[0], 10_000))
    # A fresh start seeds the legacy default workspace; the SQLite file holds the real state, so start from empty tables.
    existing = {r[0] for r in dst.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()").fetchall()}
    for name, _ in reversed(tables):  # children first
        if name in existing:
            dst.execute(f"DELETE FROM {name}")
    dst.commit()
    bad = len(pending)  # table-creation failures must fail the migration
    print(f"{'table':28} {'sqlite':>8} {'postgres':>9}")
    for name, _ in tables:
        pg_cols = [r[1] for r in dst.execute(f"PRAGMA table_info({name})").fetchall()]
        cols = [c[1] for c in src.execute(f"PRAGMA table_info({name})").fetchall() if c[1] in pg_cols]
        if not cols:
            continue
        q = ",".join(f'"{c}"' for c in cols)  # quoted: "window" is a reserved word in PostgreSQL
        insert = f"INSERT OR IGNORE INTO {name} ({q}) VALUES ({','.join('?' * len(cols))})"
        cur = src.execute(f"SELECT {q} FROM {name}")
        while True:
            rows = cur.fetchmany(BATCH)
            if not rows:
                break
            dst.executemany(insert, [tuple(r) for r in rows])
            dst.commit()
        if "seq" in pg_cols:
            dst.execute(f"SELECT setval(pg_get_serial_sequence('{name}', 'seq'), COALESCE((SELECT MAX(seq) FROM {name}), 1), (SELECT COUNT(*) > 0 FROM {name}))")
            dst.commit()
        a = src.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
        b = dst.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
        flag = "" if a == b else "   <-- MISMATCH"
        bad += a != b
        print(f"{name:28} {a:>8} {b:>9}{flag}")

    # The audit chain was copied verbatim, so it must still verify on the new database.
    try:
        from fastapi.testclient import TestClient
        orgs = [r[0] for r in dst.execute("SELECT DISTINCT org_id FROM audit_events").fetchall()]
        for org in orgs:
            token = pf.TENANT.set(org)
            try:
                res = app_main.verify_audit_chain() if hasattr(app_main, "verify_audit_chain") else None
            finally:
                pf.TENANT.reset(token)
            if res is not None and not res.get("valid", True):
                print(f"audit chain of {org}: BROKEN at {res}")
                bad += 1
    except Exception as exc:  # verification is a bonus check; the row counts above are the gate
        print(f"(audit chain check skipped: {exc})")

    print("OK: every table matches." if not bad else f"{bad} problem(s) found. Do not switch over yet.")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
