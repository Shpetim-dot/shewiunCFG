"""Search key from the organisation settings (encrypted) instead of only the environment."""
import httpx

from app import auth as auth_mod
from app import cfa_core as pf
from app import main
from app import research

PASS = "correct-horse-battery-staple-42"
SECRET = "L9Yq3n0Xb7pQ2sV6tR8wZ1cF4hJ5kM7uN0aB3dE6gI8="


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "k.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_SEARCH_API_KEY", "CFA_SEARCH_PROVIDER", "CFA_SECRET_KEY"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_SECRET_KEY", SECRET)
    auth_mod._ensured.clear()
    main.init_db()
    from fastapi.testclient import TestClient
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "owner@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def test_saved_key_is_encrypted_and_used(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    mon = monkeypatch
    mon.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(200, json={"results": [{"url": "https://ex.example/a", "title": "A", "content": "C"}]})))
    r = c.put("/api/search/config", json={"provider": "tavily", "api_key": "tvly-secret-123"}, headers=csrf(c))
    assert r.status_code == 200 and r.json()["provider"] == "tavily" and r.json()["configured"] is True
    assert r.json()["key_source"] == "database"

    with pf.db() as con:
        stored = con.execute("SELECT value FROM org_settings WHERE key='search_api_key'").fetchone()["value"]
    assert "tvly-secret-123" not in stored and stored.startswith("gAAAA")  # Fernet token

    st = c.get("/api/search/status").json()
    assert st["configured"] is True and st["key_source"] == "database" and st["provider"] == "tavily"

    body = c.post("/api/search/test", headers=csrf(c)).json()
    assert body["ok"] is True and body["provider"] == "tavily"


def test_key_auto_detects_provider_by_prefix(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.put("/api/search/config", json={"provider": "", "api_key": "tvly-abc"}, headers=csrf(c))
    assert c.get("/api/search/status").json()["provider"] == "tavily"
    c.put("/api/search/config", json={"provider": "", "api_key": "AIza-google"}, headers=csrf(c))
    assert c.get("/api/search/status").json()["provider"] == "google"


def test_environment_wins_over_database(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.put("/api/search/config", json={"provider": "tavily", "api_key": "tvly-db"}, headers=csrf(c))
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "env-key")
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "brave")
    st = c.get("/api/search/status").json()
    assert st["key_source"] == "environment" and st["provider"] == "brave"


def test_remove_and_invalid_provider(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    assert c.put("/api/search/config", json={"provider": "bing", "api_key": "x"}, headers=csrf(c)).status_code == 422
    c.put("/api/search/config", json={"provider": "tavily", "api_key": "tvly-x"}, headers=csrf(c))
    assert c.delete("/api/search/config", headers=csrf(c)).status_code == 200
    assert c.get("/api/search/status").json()["configured"] is False
