"""Teams: logo (icon/color) and focus are first-class."""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "t.db")
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


def test_team_icon_and_color_roundtrip(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/teams", json={"name": "Engineering", "mission": "Ship reliably",
                                   "icon": "rocket", "color": "#1B7F79"}, headers=csrf(c))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["icon"] == "rocket" and body["color"] == "#1B7F79"

    listed = {t["id"]: t for t in c.get("/api/teams").json()}
    assert listed[body["id"]]["icon"] == "rocket" and listed[body["id"]]["color"] == "#1B7F79"

    upd = c.put(f"/api/teams/{body['id']}", json={"name": "Engineering", "mission": "Ship reliably, fast",
                                                  "icon": "shield", "color": "#7A4E9C", "members": []}, headers=csrf(c))
    assert upd.status_code == 200, upd.text
    assert upd.json()["icon"] == "shield" and upd.json()["color"] == "#7A4E9C"


def test_team_defaults_when_no_logo_given(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/teams", json={"name": "Plain", "mission": ""}, headers=csrf(c))
    assert r.status_code == 201
    assert r.json()["icon"] == "teams" and r.json()["color"] == "#2F5BD3"


def test_preset_teams_still_work_with_defaults(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/presets/freelancer/apply", headers=csrf(c))
    assert r.status_code == 201, r.text
    teams = c.get("/api/teams").json()
    assert teams and teams[0]["icon"] == "teams"
