"""R2: source diversity (domain cap, url de-duplication)."""
import asyncio

import httpx

from app import auth as auth_mod
from app import cfa_core as pf
from app import main
from app import research

PASS = "correct-horse-battery-staple-42"
SECRET = "L9Yq3n0Xb7pQ2sV6tR8wZ1cF4hJ5kM7uN0aB3dE6gI8="


def test_domain_of_strips_subdomains_and_tracking():
    assert research.domain_of("https://www.example.com/a?utm_source=x") == "example.com"
    assert research.domain_of("http://m.example.com") == "example.com"
    assert research.dedupe_url("https://ex.com/a?utm_source=x&id=3") == "https://ex.com/a?id=3"
    assert research.dedupe_url("https://ex.com/a#frag") == "https://ex.com/a"


def test_diversify_caps_the_same_domain_and_drops_duplicates():
    found = [
        {"kind": "web", "ref": "https://news.example.com/a", "title": "A"},
        {"kind": "web", "ref": "https://news.example.com/b", "title": "B"},
        {"kind": "web", "ref": "https://news.example.com/c", "title": "C"},
        {"kind": "web", "ref": "https://other.example.org/d", "title": "D"},
        {"kind": "brain", "ref": "note-1", "title": "Note"},
    ]
    out = research.diversify(found, [], per_domain=2)
    kinds = [f["title"] for f in out]
    assert kinds.count("A") == 1 and kinds.count("B") == 1 and "C" not in kinds  # domain cap
    assert "D" in kinds and "Note" in kinds
    # page already collected is not added again even with tracking parameters
    again = research.diversify([{"kind": "web", "ref": "https://news.example.com/a?utm_source=t", "title": "A2"}],
                               [{"kind": "web", "ref": "https://news.example.com/a"}], per_domain=2)
    assert again == []


def test_research_run_keeps_sources_diverse(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "d.db")
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
    r = c.post("/api/auth/register", json={"email": "o@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    c.put("/api/search/config", json={"provider": "tavily", "api_key": "tvly-k"},
          headers={"X-CSRF-Token": c.cookies.get("cfa_csrf", "")})

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"results": [
            {"url": f"https://same.example.com/{i}", "title": f"S{i}", "content": "text"} for i in range(4)
        ] + [{"url": "https://other.example.org/x", "title": "Other", "content": "text"}]})

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    org_id = c.get("/api/auth/me").json()["user"]["org_id"]

    async def run():
        return [ev async for ev in research.run_research(research.ResearchIn(question="Diverse sources", depth="quick", web=True), 0.0)]

    tenant = pf.TENANT.set(org_id)
    try:
        events = asyncio.run(run())
    finally:
        pf.TENANT.reset(tenant)
    web = [e for e in events if e.get("type") == "source" and e.get("kind") == "web"]
    hosts = [research.domain_of(e["ref"]) for e in web]
    assert hosts.count("same.example.com") <= 2, hosts
    assert "other.example.org" in hosts
