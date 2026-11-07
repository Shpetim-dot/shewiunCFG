"""Evidence audit: claims vs cited sources in a stored research report."""
import json

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import cfa_core as pf
from app import main
from app import research

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "r.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "o@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def store_report(markdown, sources, org_id):
    with pf.db() as con:
        con.execute("INSERT INTO research (id,question,depth,mode,report,created_at,org_id) VALUES (?,?,?,?,?,?,?)",
                    ("res-1", "Market question?", "standard", "demo",
                     json.dumps({"markdown": markdown, "sources": sources, "questions": ["q1"], "chart": None}),
                     pf._m().now(), org_id))
        con.commit()


def test_audit_flags_numbers_without_citation():
    md = ("The market grew 45% in 2025 [1]. Pricing starts at 99 EUR. "
          "Three vendors lead the segment [2]. They raised 12 million USD in May [2].")
    sources = [{"n": 1, "kind": "web", "title": "a", "ref": "https://a.example"}, {"n": 2, "kind": "web", "title": "b", "ref": "https://b.example"}]
    a = research.audit_report(md, sources)
    assert a["sources_cited"] == 2 and a["coverage_percent"] == 100
    assert a["claims_with_numbers"] >= 2 and a["claims_without_citation"] == 1
    assert any("99 EUR" in s for s in a["unsupported_claims"])
    assert "1 claim" in a["verdict"]


def test_audit_reports_uncited_and_unknown_sources():
    md = "Only one claim is cited here [1] and that is it for this short text."
    sources = [{"n": 1}, {"n": 2}, {"n": 3}]
    a = research.audit_report(md, sources)
    assert a["uncited_sources"] == [2, 3] and a["coverage_percent"] == 33
    b = research.audit_report("Claim with a ghost citation [9].", sources)
    assert b["unknown_citations"] == [9]


def test_endpoint_returns_the_audit(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    org_id = c.get("/api/auth/me").json()["user"]["org_id"]
    store_report("Revenue grew 30% in 2025 [1]. Our own costs stayed flat at 20 EUR last year.", [{"n": 1, "kind": "web", "ref": "https://x.example", "title": "x"}], org_id)
    body = c.get("/api/research/res-1/audit").json()
    assert body["id"] == "res-1" and body["claims_without_citation"] >= 1
    assert c.get("/api/research/nope/audit").status_code == 404
