"""Notification center: aggregate, unread state and read marking."""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import cfa_core as pf
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "n.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "owner@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def test_empty_inbox(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.get("/api/notifications")
    assert r.status_code == 200
    body = r.json()
    assert body["items"] == [] and body["unread"] == 0


def test_approvals_announcements_and_failed_runs_appear(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    org_id = c.get("/api/auth/me").json()["user"]["org_id"]
    with pf.db() as con:
        con.execute("INSERT INTO approval_requests (id,action_type,description,requested_by,risk_level,status,created_at,org_id) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    ("appr-1", "payments.propose", "Pay supplier 4.800 EUR", "Owner", "high", "pending", pf._m().now(), org_id))
        con.execute("INSERT INTO runtime_runs (id,kind,status,input_json,state_json,error,created_at,updated_at,org_id) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    ("run-1", "research", "failed", "{}", "{}", "provider timeout", pf._m().now(), pf._m().now(), org_id))
        con.commit()
    assert c.post("/api/announcements", json={"title": "Maintenance Sunday", "body": "02:00-03:00",
                                              "level": "info"}, headers=csrf(c)).status_code in (200, 201)

    body = c.get("/api/notifications").json()
    kinds = {i["kind"] for i in body["items"]}
    assert {"approval", "announcement", "run"} <= kinds
    assert body["unread"] == len(body["items"]) > 0
    approval = next(i for i in body["items"] if i["kind"] == "approval")
    assert approval["title"].startswith("Approval needed") and approval["view"] == "control"


def test_mark_read_clears_the_unread_count(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.post("/api/announcements", json={"title": "Launch", "body": "We ship on Friday", "level": "info"}, headers=csrf(c))
    before = c.get("/api/notifications").json()
    assert before["unread"] >= 1
    keys = [i["key"] for i in before["items"]]

    r = c.post("/api/notifications/read", json={"keys": keys}, headers=csrf(c))
    assert r.status_code == 200 and r.json()["unread"] == 0
    after = c.get("/api/notifications").json()
    assert after["unread"] == 0 and all(i["read"] for i in after["items"])


def test_unknown_keys_are_ignored(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/notifications/read", json={"keys": ["no:such:key"]}, headers=csrf(c))
    assert r.status_code == 200 and r.json()["unread"] == 0
