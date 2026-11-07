"""Audit export filters (SIEM ingest) and backlink snippets."""
import json

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "a.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "a@acme.example", "password": PASS, "name": "A", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def lines(resp):
    return [json.loads(x) for x in resp.text.splitlines() if x.strip()]


def test_audit_export_returns_the_chain_and_filters(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.post("/api/teams", json={"name": "Risk desk", "mission": "m"}, headers=csrf(c))
    c.post("/api/brain/notes", json={"title": "Rule one", "body": "text", "kind": "rule"}, headers=csrf(c))

    full = c.get("/api/security/audit/export")
    assert full.status_code == 200
    assert full.headers["content-type"].startswith("application/x-ndjson")
    rows = lines(full)
    assert rows and {"event_type", "actor", "event_hash"} <= set(rows[0])

    # event type prefix filter
    filtered = c.get("/api/security/audit/export?event_type=team")
    assert filtered.status_code == 200
    assert lines(filtered) and all(r["event_type"].startswith("team") for r in lines(filtered))

    # actor filter (SQL LIKE is case-insensitive for ASCII)
    by_actor = lines(c.get("/api/security/audit/export?actor=acme"))
    assert by_actor and all("acme" in r["actor"].lower() for r in by_actor)

    # time window and limit
    assert lines(c.get("/api/security/audit/export?since=9999-01-01T00:00:00+00:00")) == []
    assert len(lines(c.get("/api/security/audit/export?limit=1"))) == 1


def test_audit_export_requires_admin(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    anon = TestClient(main.app)
    assert anon.get("/api/security/audit/export").status_code == 401


def test_backlink_snippets_in_note_detail(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.post("/api/brain/notes", json={"title": "Pricing rules", "body": "Floor is 90 EUR.", "kind": "rule"}, headers=csrf(c))
    c.post("/api/brain/notes", json={"title": "Client checklist", "body": "Signed scope. See [[Pricing rules]] for the floor.",
                                     "kind": "note"}, headers=csrf(c))
    notes = {n["title"]: n for n in c.get("/api/brain/notes").json()}
    full = c.get(f"/api/brain/notes/{notes['Pricing rules']['id']}").json()
    assert full["backlinks"] == ["Client checklist"]
    detail = full["backlink_details"][0]
    assert detail["title"] == "Client checklist" and "[[Pricing rules]]" in detail["snippet"]
