"""R1: a sub-question without sources triggers one rephrased follow-up search."""
import asyncio
import httpx
from app import auth as auth_mod
from app import cfa_core as pf
from app import main
from app import research

PASS = "correct-horse-battery-staple-42"
SECRET = "L9Yq3n0Xb7pQ2sV6tR8wZ1cF4hJ5kM7uN0aB3dE6gI8="


def test_gap_retry_adds_sources(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "r1.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_SEARCH_API_KEY", "CFA_SEARCH_PROVIDER", "CFA_SECRET_KEY"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_SECRET_KEY", SECRET)
    monkeypatch.setenv("CFA_RESEARCH_FULLTEXT", "0")
    auth_mod._ensured.clear()
    main.init_db()
    from fastapi.testclient import TestClient
    c = TestClient(main.app)
    assert c.post("/api/auth/register", json={"email": "o@acme.example", "password": PASS, "name": "Owner",
                                              "org_name": "Acme"}).status_code == 201
    c.put("/api/search/config", json={"provider": "tavily", "api_key": "tvly-k"},
          headers={"X-CSRF-Token": c.cookies.get("cfa_csrf", "")})
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] <= 2:  # first pass finds nothing
            return httpx.Response(200, json={"results": []})
        return httpx.Response(200, json={"results": [
            {"url": "https://gap.example/a", "title": "Gap source", "content": "evidence text"}]})

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    org_id = c.get("/api/auth/me").json()["user"]["org_id"]

    async def run():
        return [ev async for ev in research.run_research(
            research.ResearchIn(question="Thin evidence question", depth="quick", web=True), 0.0)]

    tenant = pf.TENANT.set(org_id)
    try:
        events = asyncio.run(run())
    finally:
        pf.TENANT.reset(tenant)
    retried = [e for e in events if e.get("type") == "source" and e.get("retry")]
    assert retried, "no retry source added"
    assert any("follow-up search" in (e.get("text") or "") for e in events if e.get("type") == "activity")
