"""Full-text enrichment in the research pipeline (Trafilatura optional)."""
import asyncio
import httpx
from app import auth as auth_mod
from app import main
from app import research

PASS = "correct-horse-battery-staple-42"
SECRET = "L9Yq3n0Xb7pQ2sV6tR8wZ1cF4hJ5kM7uN0aB3dE6gI8="


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "f.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_SEARCH_API_KEY", "CFA_SEARCH_PROVIDER", "CFA_SECRET_KEY"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_SECRET_KEY", SECRET)
    auth_mod._ensured.clear()
    main.init_db()
    from fastapi.testclient import TestClient
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "o@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def test_web_source_gets_full_text(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.put("/api/search/config", json={"provider": "tavily", "api_key": "tvly-k"}, headers=csrf(c))
    long_text = "Anthropic launched a new model. " * 40

    def handler(request: httpx.Request) -> httpx.Response:
        if "api.tavily.com" in str(request.url):
            return httpx.Response(200, json={"results": [{"url": "https://news.example/a", "title": "A", "content": "short"}]})
        return httpx.Response(200, headers={"content-type": "text/html"},
                              text=f"<html><body><article><p>{long_text}</p></article></body></html>")

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    from app import cfa_core as pf
    org_id = c.get("/api/auth/me").json()["user"]["org_id"]

    async def run():
        return [ev async for ev in research.run_research(research.ResearchIn(question="Anthropic news", depth="quick", web=True), 0.0)]

    tenant = pf.TENANT.set(org_id)
    try:
        events = asyncio.run(run())
    finally:
        pf.TENANT.reset(tenant)
    src = [e for e in events if e.get("type") == "source"][0]
    assert src.get("full_text") is True
    assert len(src["snippet"]) > 200
    assert any("full page" in (e.get("text") or "") for e in events if e.get("type") == "activity")
