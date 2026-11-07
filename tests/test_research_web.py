"""Research uses the web when a key exists, and demo sub-questions stay readable."""
import asyncio
import json

import httpx

from app import auth as auth_mod
from app import main
from app import research

PASS = "correct-horse-battery-staple-42"
SECRET = "L9Yq3n0Xb7pQ2sV6tR8wZ1cF4hJ5kM7uN0aB3dE6gI8="


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "w.db")
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


def test_demo_sub_questions_use_the_subject_not_the_whole_prompt():
    q = ("Research the latest news about Anthropic: product launches, new hires and funding deals in the last 12 months. "
         "Focus on facts with dates and sources.")
    subs = research.split_question(q, 4)
    assert len(subs) == 4
    assert all(len(s) < len(q) for s in subs)
    assert "Anthropic" in subs[0]
    assert not any("last 12 months" in s for s in subs)


def test_web_flag_reaches_tavily_with_a_stored_key(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.put("/api/search/config", json={"provider": "tavily", "api_key": "tvly-test"}, headers=csrf(c))
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        return httpx.Response(200, json={"results": [
            {"url": "https://news.example/anthropic", "title": "Anthropic news", "content": "Anthropic launched a model."}]})

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))

    from app import cfa_core as pf
    org_id = c.get("/api/auth/me").json()["user"]["org_id"]

    async def run():
        events = []
        async for ev in research.run_research(research.ResearchIn(question="Anthropic news", depth="quick", web=True), 0.0):
            events.append(ev)
        return events

    tenant = pf.TENANT.set(org_id)  # the key is stored per organisation
    try:
        events = asyncio.run(run())
    finally:
        pf.TENANT.reset(tenant)
    assert any("api.tavily.com" in u for u in calls), calls
    sources = [e for e in events if e.get("type") == "source"]
    assert sources and sources[0]["kind"] == "web"
    done = [e for e in events if e.get("type") == "done"]
    assert done and done[0]["report"]["sources"]


def test_no_key_means_no_web_and_a_clear_activity_line(tmp_path, monkeypatch):
    fresh(tmp_path, monkeypatch)

    async def run():
        return [ev async for ev in research.run_research(research.ResearchIn(question="Pricing research", depth="quick", web=True), 0.0)]

    events = asyncio.run(run())
    assert any("not configured" in (e.get("text") or "") for e in events if e.get("type") == "activity")
