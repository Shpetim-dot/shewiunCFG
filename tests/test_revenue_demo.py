"""Revenue endpoint works in demo mode and with an account."""
from fastapi.testclient import TestClient
from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"

def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "r.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_BILLING"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)

def test_revenue_in_demo_mode(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.get("/api/org/revenue")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["plan"] == "free" and body["status"] == "demo" and body["mrr_eur"] == 0

def test_revenue_after_registration(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    assert c.post("/api/auth/register", json={"email": "a@acme.example", "password": PASS, "org_name": "Acme"}).status_code == 201
    r = c.get("/api/org/revenue")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "active" and body["seats"] == 1 and body["plan"] == "free"
    anon = TestClient(main.app)
    assert anon.get("/api/org/revenue").status_code == 401
