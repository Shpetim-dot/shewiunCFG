"""Notification center: one aggregate of everything that needs a person, with per-user read state."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app import cfa_core as pf

router = APIRouter()


def _columns(con) -> None:
    con.execute("CREATE TABLE IF NOT EXISTS notification_reads (user_id TEXT NOT NULL, key TEXT NOT NULL, "
                "read_at TEXT NOT NULL, PRIMARY KEY (user_id, key))")


def _read_keys(con, user_id: str) -> set[str]:
    return {r[0] for r in con.execute("SELECT key FROM notification_reads WHERE user_id=?", (user_id,))}


def collect(con) -> list[dict[str, Any]]:
    """Everything that currently needs attention for this organisation, newest first."""
    out: list[dict[str, Any]] = []
    for r in con.execute("SELECT id, action_type, description, risk_level, created_at FROM approval_requests "
                         "WHERE status='pending' AND org_id=? ORDER BY created_at DESC LIMIT 20", (pf.org(),)):
        out.append({"key": "approval:" + r["id"], "kind": "approval", "title": "Approval needed: " + r["action_type"],
                    "detail": r["description"], "risk": r["risk_level"], "ts": r["created_at"], "view": "control"})
    for r in con.execute("SELECT id, org_id, title, body, level, published_at FROM announcements "
                         "WHERE (org_id=? OR org_id IS NULL) AND (expires_at IS NULL OR expires_at > ?) "
                         "ORDER BY published_at DESC LIMIT 10", (pf.org(), pf._m().now())):
        out.append({"key": "announcement:" + r["id"], "kind": "announcement", "title": r["title"],
                    "detail": r["body"], "risk": r["level"], "ts": r["published_at"], "view": "org" if r["org_id"] else "org"})
    for r in con.execute("SELECT id, kind, error, updated_at FROM runtime_runs WHERE status='failed' AND (org_id=? OR org_id IS NULL) "
                         "ORDER BY updated_at DESC LIMIT 10", (pf.org(),)):
        out.append({"key": "run:" + r["id"], "kind": "run", "title": "Run failed: " + (r["kind"] or "job"),
                    "detail": (r["error"] or "")[:300], "risk": "high", "ts": r["updated_at"], "view": "control"})
    out.sort(key=lambda x: x["ts"] or "", reverse=True)
    return out


@router.get("/api/notifications")
def notifications(request: Request) -> dict[str, Any]:
    p = pf._principal(request)
    uid = p.get("user_id") or ("anon:" + (p.get("name") or "guest"))
    with pf.db() as con:
        _columns(con)
        items = collect(con)
        read = _read_keys(con, uid)
    for item in items:
        item["read"] = item["key"] in read
    return {"items": items, "unread": sum(1 for i in items if not i["read"]), "user": uid}


class ReadIn(BaseModel):
    keys: list[str] = Field(default_factory=list, max_length=200)


@router.post("/api/notifications/read")
def mark_read(item: ReadIn, request: Request) -> dict[str, Any]:
    p = pf._principal(request)
    uid = p.get("user_id") or ("anon:" + (p.get("name") or "guest"))
    now = pf._m().now()
    with pf.db() as con:
        _columns(con)
        for key in item.keys[:200]:
            con.execute("INSERT OR REPLACE INTO notification_reads (user_id, key, read_at) VALUES (?,?,?)", (uid, key, now))
        con.commit()
        items = collect(con)
        read = _read_keys(con, uid)
    return {"unread": sum(1 for i in items if i["key"] not in read)}
