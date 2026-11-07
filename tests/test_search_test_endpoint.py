"""Search status and the live key test endpoint."""
import asyncio

import httpx
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main
from app import research

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "s.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_SEARCH_API_KEY", "CFA_SEARCH_PROVIDER", "CFA_SEARCH_CX"):
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


def test_status_reports_provider_without_key(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    s = c.get("/api/search/status").json()
    assert s["provider"] == "brave" and s["configured"] is False and "brave" in s["providers"]


def test_status_reports_tavily_and_key(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "tavily")
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "tvly-test")
    s = c.get("/api/search/status").json()
    assert s["provider"] == "tavily" and s["configured"] is True


def test_test_endpoint_without_key(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/search/test", headers=csrf(c))
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False and "no search key" in body["detail"]


def test_test_endpoint_success(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "tavily")
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "tvly-test")
    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(200, json={"results": [{"url": "https://example.com/a", "title": "A", "content": "snippet"}]})))
    body = c.post("/api/search/test", headers=csrf(c)).json()
    assert body["ok"] is True and body["results"] == 1 and body["sample"][0]["ref"] == "https://example.com/a"


def test_test_endpoint_explains_rejected_key(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "tavily")
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "bad-key")
    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(401, text="unauthorized")))
    body = c.post("/api/search/test", headers=csrf(c)).json()
    assert body["ok"] is False and body["status"] == 401
    assert "rejected" in body["detail"].lower() or "rejected" in body["hint"].lower()


def test_rate_limit_is_explained(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "tavily")
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "k")
    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(429, text="slow down")))
    body = c.post("/api/search/test", headers=csrf(c)).json()
    assert body["status"] == 429 and "rate limit" in body["hint"].lower()


def test_test_endpoint_requires_an_account(tmp_path, monkeypatch):
    fresh(tmp_path, monkeypatch)
    anon = TestClient(main.app)
    assert anon.post("/api/search/test").status_code == 401
