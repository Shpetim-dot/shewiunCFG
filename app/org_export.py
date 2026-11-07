"""Full organisation export for GDPR data portability.

One endpoint returns everything this organisation holds, as JSON. Secret material is never
exported: the column filter drops password hashes, session/token hashes, MFA secrets and key
material, and API keys are global to the installation rather than per organisation.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response

from app import cfa_core as pf

router = APIRouter()

# Tables that carry an org_id (or are the organisation itself) and are safe to export.
TABLES = ["users", "invitations", "teams", "bots", "notes", "note_versions", "calls", "approval_requests",
          "audit_events", "llm_usage", "org_billing", "org_usage", "org_settings", "org_apps", "org_events",
          "announcements", "research", "channels", "channel_messages"]
SECRET_COLUMNS = {"password_hash", "token_hash", "mfa_secret", "mfa_recovery", "secret", "api_key",
                  "stripe_secret", "webhook_secret", "token"}


def _columns(con, table: str) -> list[str]:
    return [r[1] for r in con.execute(f"PRAGMA table_info({table})")]


def collect(con) -> dict[str, Any]:
    org_id = pf.org()
    org = con.execute("SELECT id,name,slug,plan,status,created_at,updated_at FROM orgs WHERE id=?", (org_id,)).fetchone()
    out: dict[str, Any] = {"organisation": dict(org) if org else {"id": org_id}, "exported_at": pf._m().now(),
                           "format": "shewiun-org-export/1"}
    counts: dict[str, int] = {}
    for table in TABLES:
        cols = _columns(con, table)
        if not cols:
            continue
        keep = [c for c in cols if c not in SECRET_COLUMNS]
        if "org_id" not in cols:
            continue
        rows = con.execute(f"SELECT {','.join(keep)} FROM {table} WHERE org_id=?", (org_id,)).fetchall()
        out[table] = [dict(r) for r in rows]
        counts[table] = len(rows)
    out["counts"] = counts
    return out


@router.get("/api/org/export")
def export_org(request: Request) -> Response:
    """Download everything this organisation stores as one JSON file (owner/admin only)."""
    p = pf.need_admin(request)
    with pf.db() as con:
        payload = collect(con)
    slug = payload["organisation"].get("slug") or "org"
    body = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
    pf._m().append_audit("org.exported", p["name"], {"tables": len(payload.get("counts", {})),
                                                     "rows": sum(payload.get("counts", {}).values())})
    return Response(body, media_type="application/json",
                    headers={"Content-Disposition": f'attachment; filename="{slug}-export.json"'})


@router.get("/api/org/export/summary")
def export_summary() -> dict[str, Any]:
    """What an export would contain, without building the file (used by the organisation view)."""
    with pf.db() as con:
        payload = collect(con)
    counts = payload.get("counts", {})
    return {"tables": len(counts), "rows": sum(counts.values()), "counts": counts,
            "note": "The export contains organisation, users, agents, notes, calls, approvals, audit events, "
                    "usage, billing rows, settings, apps, announcements, research and channel messages. "
                    "Secrets (password hashes, session tokens, MFA secrets) are never included."}
