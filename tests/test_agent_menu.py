"""Agent rename and delete (used by the sidebar context menu)."""
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
    r = c.post("/api/auth/register", json={"email": "o@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def test_rename_keeps_the_id(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    bots = c.get("/api/bots").json()
    target = bots[0]
    r = c.patch(f"/api/bots/{target['id']}", json={"name": "Ada Lovelace"}, headers=csrf(c))
    assert r.status_code == 200, r.text
    assert r.json() == {"id": target["id"], "name": "Ada Lovelace"}
    names = {b["id"]: b["name"] for b in c.get("/api/bots").json()}
    assert names[target["id"]] == "Ada Lovelace"
    # the audit trail records the rename
    events = c.get("/api/security/audit?limit=20").json()["events"]
    assert any(e["event_type"] == "agent.renamed" for e in events)


def test_rename_needs_a_valid_name(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    bot = c.get("/api/bots").json()[0]
    assert c.patch(f"/api/bots/{bot['id']}", json={"name": "x"}, headers=csrf(c)).status_code == 422
    assert c.patch("/api/bots/nope", json={"name": "Valid name"}, headers=csrf(c)).status_code == 404


def test_delete_removes_the_agent(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    bots = c.get("/api/bots").json()
    target = bots[0]
    r = c.delete(f"/api/bots/{target['id']}", headers=csrf(c))
    assert r.status_code == 200 and r.json()["deleted"] is True
    assert target["id"] not in {b["id"] for b in c.get("/api/bots").json()}
    events = c.get("/api/security/audit?limit=20").json()["events"]
    assert any(e["event_type"] == "agent.deleted" for e in events)
    assert c.delete("/api/bots/nope", headers=csrf(c)).status_code == 404


def test_rename_and_delete_require_an_admin(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    bot = c.get("/api/bots").json()[0]
    anon = TestClient(main.app)
    assert anon.patch(f"/api/bots/{bot['id']}", json={"name": "Hacked"}).status_code == 401
    assert anon.delete(f"/api/bots/{bot['id']}").status_code == 401
