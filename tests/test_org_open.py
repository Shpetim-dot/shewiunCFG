"""Organisation endpoints must not bounce into sign-in in the open demo workspace."""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "o.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def test_org_views_work_in_the_open_demo_workspace(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.get("/api/org/members")
    assert r.status_code == 200, r.text
    assert r.json()["members"] == [] and r.json()["invitations"] == []
    assert "demo" in r.json().get("note", "").lower()
    assert c.get("/api/org/revenue").status_code == 200
    assert c.get("/api/announcements").status_code == 200


def test_org_members_still_require_a_session_when_users_exist(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.post("/api/auth/register", json={"email": "a@acme.example", "password": "correct-horse-battery-staple-42",
                                       "org_name": "Acme"})
    anon = TestClient(main.app)
    assert anon.get("/api/org/members").status_code == 401
