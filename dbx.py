"""Database access for SQLite (default) and PostgreSQL.

Set CFA_DATABASE_URL (or DATABASE_URL) to postgresql://user:pass@host:5432/dbname and the whole platform
runs on PostgreSQL; leave it unset and nothing changes (SQLite file at CFA_DATABASE_PATH).

The platform was written against the sqlite3 API (``con.execute(sql, params)``, ``?`` placeholders,
rows that work as ``row["name"]`` and ``row[0]``, ``with con:`` commits). Instead of touching every query,
PgConn offers exactly that API on top of psycopg and translates the few SQLite-only constructs:

* ``?`` placeholders, ``PRAGMA table_info``, ``sqlite_master`` lookups
* ``INSERT OR IGNORE`` / ``INSERT OR REPLACE`` (conflict target read from the table's primary key)
* ``INTEGER PRIMARY KEY AUTOINCREMENT`` -> BIGSERIAL, ``INTEGER`` -> BIGINT, ``REAL`` -> DOUBLE PRECISION
* ``COLLATE NOCASE`` (e-mail addresses are stored lower-cased), ``LIKE`` -> ``ILIKE``, ``date('now','-N day')``
* FTS5 virtual tables and triggers are skipped; keyword search then uses the plain-scan fallback in brain.py

A failed INSERT inside a transaction does not poison the transaction (each INSERT runs in a savepoint),
which matches how SQLite behaved and what the existing code relies on. Failures are re-raised as
sqlite3.IntegrityError / sqlite3.OperationalError so the existing ``except`` clauses keep working.

Tests can isolate databases on one server with CFA_DB_SCHEMA_FROM_PATH=1 (one schema per DB_PATH).
"""
from __future__ import annotations

import hashlib
import os
import re
import sqlite3
import threading
from typing import Any, Iterable

_lock = threading.Lock()
_pools: dict[str, Any] = {}
_schemas_ready: set[tuple[str, str]] = set()
_pk_cache: dict[tuple[str, str], list[str]] = {}


def url() -> str:
    return os.getenv("CFA_DATABASE_URL") or os.getenv("DATABASE_URL") or ""


def is_pg() -> bool:
    return url().startswith(("postgres://", "postgresql://"))


def backend() -> str:
    return "postgresql" if is_pg() else "sqlite"


# ---------------------------------------------------------------- rows
class Row(tuple):
    """Behaves like sqlite3.Row: index by position or by column name, keys(), dict(row)."""

    def __new__(cls, keys: list[str], values: Iterable[Any]):
        obj = tuple.__new__(cls, values)
        obj._k = keys
        return obj

    def __getitem__(self, i):
        if isinstance(i, str):
            try:
                return tuple.__getitem__(self, self._k.index(i))
            except ValueError:
                raise IndexError("No item with that key") from None
        return tuple.__getitem__(self, i)

    def keys(self) -> list[str]:
        return list(self._k)


def _row_factory(cursor):
    keys = [c.name for c in (cursor.description or [])]
    return lambda values: Row(keys, values)


# ---------------------------------------------------------------- SQL translation
def _split_statements(script: str) -> list[str]:
    out, buf, i, n = [], [], 0, len(script)
    while i < n:
        c = script[i]
        if c == "'":
            j = i + 1
            while j < n:
                if script[j] == "'" and script[j + 1:j + 2] == "'":
                    j += 2
                    continue
                if script[j] == "'":
                    break
                j += 1
            buf.append(script[i:j + 1]); i = j + 1
        elif script.startswith("--", i):
            j = script.find("\n", i)
            i = n if j < 0 else j  # comments are dropped
        elif script.startswith("/*", i):
            j = script.find("*/", i + 2)
            i = n if j < 0 else j + 2
        elif c == ";":
            stmt = "".join(buf).strip()
            if stmt:
                out.append(stmt)
            buf = []; i += 1
        else:
            buf.append(c); i += 1
    tail = "".join(buf).strip()
    if tail:
        out.append(tail)
    return out


def _placeholders(sql: str, has_params: bool, named: bool = False) -> str:
    """? -> %s outside string literals; a literal % is doubled when parameters are used."""
    out, i, n = [], 0, len(sql)
    while i < n:
        c = sql[i]
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'" and sql[j + 1:j + 2] == "'":
                    j += 2
                    continue
                if sql[j] == "'":
                    break
                j += 1
            lit = sql[i:j + 1]
            out.append(lit.replace("%", "%%") if has_params else lit); i = j + 1
        elif c == "?":
            out.append("%s"); i += 1
        elif named and c == ":" and re.match(r":[A-Za-z_]\w*", sql[i:]) and sql[i - 1:i] != ":":
            m = re.match(r":([A-Za-z_]\w*)", sql[i:])
            out.append(f"%({m.group(1)})s"); i += m.end()
        elif c == "%" and has_params:
            out.append("%%"); i += 1
        else:
            out.append(c); i += 1
    return "".join(out)


_SM = ("(SELECT table_name AS name, 'table' AS type, table_name AS tbl_name, NULL::text AS sql "
       "FROM information_schema.tables WHERE table_schema = current_schema()) AS sqlite_master")
_NOOP = "SELECT 1 WHERE FALSE"


class PgConn:
    """sqlite3.Connection look-alike on PostgreSQL (see module docstring)."""

    def __init__(self, pool, schema: str):
        self._pool, self._schema, self._conn = pool, schema, None
        self.row_factory = None  # accepted and ignored: rows are always Row objects

    # -- connection handling
    def _raw(self):
        if self._conn is None:
            c = self._pool.getconn(timeout=float(os.getenv("CFA_PG_POOL_TIMEOUT", "15")))
            if self._schema != "public":
                c.execute(f'SET search_path TO "{self._schema}", public')
                c.commit()  # a SET inside an open transaction would be undone by a rollback
            self._conn = c
        return self._conn

    def _release(self) -> None:
        c, self._conn = self._conn, None
        if c is not None:
            try:
                c.rollback() if c.info.transaction_status != 0 else None
            except Exception:
                pass
            self._pool.putconn(c)

    def close(self) -> None:
        self._release()

    def commit(self) -> None:
        if self._conn is not None:
            self._conn.commit()

    def rollback(self) -> None:
        if self._conn is not None:
            self._conn.rollback()

    def __enter__(self) -> "PgConn":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        try:
            self.rollback() if exc_type else self.commit()
        finally:
            self._release()  # the pool gets the connection back; a later use re-acquires one transparently

    def __del__(self) -> None:
        try:
            self._release()
        except Exception:
            pass

    # -- translation
    def _pk(self, table: str) -> list[str]:
        key = (self._schema, table)
        if key not in _pk_cache:
            rows = self._raw().execute(
                "SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum = ANY(i.indkey) "
                "WHERE i.indrelid = %s::regclass AND i.indisprimary ORDER BY array_position(i.indkey, a.attnum)", (table,)).fetchall()
            _pk_cache[key] = [r[0] for r in rows]
        return _pk_cache[key]

    def translate(self, sql: str, has_params: bool, named: bool = False) -> str:
        s = sql.strip().rstrip(";").strip()
        head = s[:40].upper()
        if head.startswith("PRAGMA"):
            m = re.match(r"PRAGMA\s+table_info\(\s*[\"']?(\w+)[\"']?\s*\)", s, re.I)
            if m:
                return ("SELECT ordinal_position - 1 AS cid, column_name AS name, data_type AS type, 0 AS notnull, NULL AS dflt_value, 0 AS pk "
                        f"FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '{m.group(1)}' ORDER BY ordinal_position")
            return "SELECT 'ok'" if "quick_check" in s.lower() or "integrity_check" in s.lower() else _NOOP
        if head.startswith(("CREATE VIRTUAL", "CREATE TRIGGER", "DROP TRIGGER")):
            return _NOOP
        if head.startswith(("CREATE TABLE", "ALTER TABLE")):
            s = re.sub(r"\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b", "BIGSERIAL PRIMARY KEY", s, flags=re.I)
            s = re.sub(r"\bINTEGER\b", "BIGINT", s, flags=re.I)
            s = re.sub(r"\bREAL\b", "DOUBLE PRECISION", s, flags=re.I)
            s = re.sub(r"\bBLOB\b", "BYTEA", s, flags=re.I)
        s = re.sub(r"\s+COLLATE\s+NOCASE\b", "", s, flags=re.I)
        s = re.sub(r"\bsqlite_master\b", _SM, s, flags=re.I)
        s = re.sub(r"date\('now',\s*'-(\d+) day'\)", r"to_char(now() - interval '\1 day', 'YYYY-MM-DD')", s, flags=re.I)
        s = re.sub(r"(?<![A-Za-z_])LIKE\b", "ILIKE", s, flags=re.I)
        t = re.match(r"INSERT\s+INTO\s+(\w+)", s, re.I)
        if t and re.search(r"ON\s+CONFLICT", s, re.I):  # SET n = n + 1 is ambiguous next to EXCLUDED in PostgreSQL
            s = re.sub(r"(DO\s+UPDATE\s+SET\s+)(\w+)(\s*=\s*)\2(\s*[+\-])", lambda mm: f"{mm.group(1)}{mm.group(2)}{mm.group(3)}{t.group(1)}.{mm.group(2)}{mm.group(4)}", s, flags=re.I)
        m = re.match(r"INSERT\s+OR\s+(IGNORE|REPLACE)\s+INTO\s+(\w+)\s*(\(([^)]*)\))?", s, re.I)
        if m:
            kind, table, cols = m.group(1).upper(), m.group(2), [c.strip() for c in (m.group(4) or "").split(",") if c.strip()]
            s = re.sub(r"^INSERT\s+OR\s+(IGNORE|REPLACE)\s+INTO", "INSERT INTO", s, flags=re.I)
            if kind == "IGNORE":
                s += " ON CONFLICT DO NOTHING"
            else:
                pk = self._pk(table)
                upd = [c for c in cols if c not in pk]
                s += f" ON CONFLICT ({', '.join(pk)}) DO " + ("UPDATE SET " + ", ".join(f"{c}=EXCLUDED.{c}" for c in upd) if upd else "NOTHING")
        return _placeholders(s, has_params, named)

    # -- execution
    def _run(self, sql: str, params=()):
        import psycopg
        has = bool(params)
        named = isinstance(params, dict)
        text = self.translate(sql, has, named)
        raw = self._raw()
        savepoint = text.lstrip()[:6].upper() == "INSERT" and raw.info.transaction_status != 0
        try:
            if savepoint:
                raw.execute("SAVEPOINT cfa_sp")
            cur = raw.execute(text, (params if named else list(params)) if has else None)
            if savepoint:
                raw.execute("RELEASE SAVEPOINT cfa_sp")
            return PgCursor(cur)
        except psycopg.Error as exc:
            if savepoint:
                try:
                    raw.execute("ROLLBACK TO SAVEPOINT cfa_sp")
                except psycopg.Error:
                    pass
            cls = sqlite3.IntegrityError if isinstance(exc, psycopg.errors.IntegrityError) else sqlite3.OperationalError
            raise cls(f"{str(exc).splitlines()[0]} [SQL: {text[:160]}]") from exc

    def execute(self, sql: str, params=()) -> "PgCursor":
        return self._run(sql, params)

    def executemany(self, sql: str, seq: Iterable[Iterable[Any]]) -> "PgCursor":
        cur = None
        for p in seq:
            cur = self._run(sql, tuple(p))
        return cur or PgCursor(None)

    def executescript(self, script: str) -> None:
        for stmt in _split_statements(script):
            self._run(stmt, ())
        self.commit()

    def serialize(self, key: str) -> None:
        """Transaction-scoped lock, so two writers cannot extend the same hash chain at once."""
        self._raw().execute("SELECT pg_advisory_xact_lock(%s)", (int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], "big", signed=True),))


class PgCursor:
    def __init__(self, cur):
        self._c = cur
        self.lastrowid = None

    @property
    def rowcount(self) -> int:
        return self._c.rowcount if self._c is not None else 0

    @property
    def description(self):
        return self._c.description if self._c is not None else None

    def fetchone(self):
        return self._c.fetchone() if self._c is not None and self._c.description else None

    def fetchall(self):
        return self._c.fetchall() if self._c is not None and self._c.description else []

    def fetchmany(self, n: int = 1):
        return self._c.fetchmany(n) if self._c is not None and self._c.description else []

    def __iter__(self):
        return iter(self.fetchall())


def chain_lock(con: Any, key: str) -> None:
    """No-op on SQLite (its write lock already serialises); an advisory lock on PostgreSQL."""
    if isinstance(con, PgConn):
        con.serialize(key)


# ---------------------------------------------------------------- connections
def schema_name(db_path: Any) -> str:
    return _schema_for(db_path)


def _schema_for(db_path: Any) -> str:
    if os.getenv("CFA_DB_SCHEMA_FROM_PATH") == "1":
        return "t_" + hashlib.md5(str(db_path).encode()).hexdigest()[:16]
    schema = os.getenv("CFA_PG_SCHEMA") or "public"
    if not re.fullmatch(r"[A-Za-z0-9_]+", schema):
        raise ValueError("CFA_PG_SCHEMA may only contain letters, digits and underscores")
    return schema


def _pool():
    target = url()
    with _lock:
        if target not in _pools:
            import psycopg
            from psycopg.adapt import Loader
            from psycopg_pool import ConnectionPool

            class _Numeric(Loader):  # SUM()/AVG() come back as numeric: hand out int/float like SQLite does
                def load(self, data):
                    text = bytes(data).decode()
                    return int(text) if re.fullmatch(r"-?\d+", text) else float(text)

            def configure(conn):
                conn.adapters.register_loader("numeric", _Numeric)
                conn.commit()

            _pools[target] = ConnectionPool(
                target, min_size=int(os.getenv("CFA_PG_POOL_MIN", "1")), max_size=int(os.getenv("CFA_PG_POOL_MAX", "10")), open=True, configure=configure,
                kwargs={"row_factory": _row_factory, "cursor_factory": psycopg.ClientCursor, "connect_timeout": 10, "application_name": "shewiun-cfa"})
        return _pools[target]


def connect(db_path: Any):
    """A connection with the sqlite3 API. SQLite unless CFA_DATABASE_URL points at PostgreSQL."""
    if not is_pg():
        con = sqlite3.connect(db_path, timeout=15)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA busy_timeout = 15000")
        con.execute("PRAGMA foreign_keys = ON")
        con.execute("PRAGMA journal_mode = WAL")  # readers do not block the writer; needed for consistent online backups
        con.execute("PRAGMA synchronous = NORMAL")
        return con
    schema, pool = _schema_for(db_path), _pool()
    key = (url(), schema)
    if key not in _schemas_ready:
        with pool.connection() as c:
            if schema != "public":
                c.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
        _schemas_ready.add(key)
    return PgConn(pool, schema)
