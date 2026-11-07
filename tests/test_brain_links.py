"""Brain list: backlink counts for the Obsidian-style rail."""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "b.db")
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


def test_notes_list_reports_links_and_backlinks(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    a = c.post("/api/brain/notes", json={"title": "Pricing rules", "body": "Floor is 90 EUR. See [[Client checklist]].",
                                         "kind": "rule"}, headers=csrf(c)).json()
    b = c.post("/api/brain/notes", json={"title": "Client checklist", "body": "Signed scope. See [[Pricing rules]].",
                                         "kind": "note"}, headers=csrf(c)).json()
    assert b["title"] == "Client checklist"
    notes = {n["title"]: n for n in c.get("/api/brain/notes").json()}
    assert notes["Pricing rules"]["links"] == ["Client checklist"]
    assert notes["Pricing rules"]["backlinks_count"] == 1
    assert notes["Client checklist"]["backlinks_count"] == 1
    full = c.get(f"/api/brain/notes/{a['id']}").json()
    assert full["backlinks"] == ["Client checklist"]
