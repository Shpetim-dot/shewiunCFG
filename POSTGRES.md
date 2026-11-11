# Running Shewiun on PostgreSQL

Shewiun runs on SQLite by default. Set `CFA_DATABASE_URL` and the same code runs on PostgreSQL 15 or newer
(`app/dbx.py` translates the few SQLite-only constructs; see its docstring).

## New installation
`cp .env.example .env`, set `CFA_PG_PASSWORD` (and the usual `CFA_SECRET_KEY`, `CFA_PUBLIC_URL`), then
`docker compose up -d --build`. The compose file starts PostgreSQL, the app and Caddy. The database port is not published.

## Moving an existing SQLite installation
1. `./tools/backup.sh` (SQLite backup) and keep that file: it is your fallback.
2. `docker compose stop cfa` so that nothing writes during the copy.
3. `docker compose up -d db`, then
   `docker compose run --rm cfa python tools/sqlite_to_postgres.py --sqlite /data/cfa.db --pg "$CFA_DATABASE_URL"`
   The tool creates the schema, copies every table in foreign-key order, resets sequences, compares row counts per table
   and checks that the audit chain still verifies. Exit code 0 means every table matches. It refuses to overwrite a
   PostgreSQL database that already holds an organisation unless you pass `--force`.
4. `docker compose up -d cfa`, sign in with your old password, open Control and run the audit verification.
5. Rollback: stop the app, remove `CFA_DATABASE_URL` from the environment, start the app again. The SQLite file was only read.

## Backups
`./tools/backup_pg.sh` writes a `pg_dump` custom-format archive, verifies it is readable and keeps 14 days. The in-app
backup button also uses `pg_dump` (the app image contains `postgresql-client`). Restore with `pg_restore`, see the script header.
Keep a copy off the machine.

## What differs from SQLite
* Keyword search in the Brain uses the plain-scan fallback (no FTS5). It is fine for thousands of notes; add a `tsvector` index when you outgrow it.
* The audit hash chains are extended under an advisory lock so two writers cannot fork a chain.
* A failed INSERT inside a transaction does not abort the transaction (each INSERT runs in a savepoint), as on SQLite.
* One uvicorn worker is still the supported setup; the rate limiter and the SSE hub live in process memory.

## Tests
`pytest` runs on SQLite. To run the same suite on PostgreSQL set `CFA_DATABASE_URL` and `CFA_DB_SCHEMA_FROM_PATH=1`
(one schema per test database). CI does both.
