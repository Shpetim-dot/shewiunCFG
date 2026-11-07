"""Full organisation export (GDPR portability)."""
import json

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "x.db")
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


def test_export_contains_the_organisation_data_without_secrets(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    c.post("/api/teams", json={"name": "Risk desk", "mission": "m"}, headers=csrf(c))
    c.post("/api/brain/notes", json={"title": "Pricing floor", "body": "90 EUR per hour", "kind": "rule"}, headers=csrf(c))

    r = c.get("/api/org/export")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("application/json")
    assert "attachment" in r.headers["content-disposition"]
    data = json.loads(r.text)
    assert data["format"] == "shewiun-org-export/1"
    assert data["organisation"]["slug"] == "acme"
    assert any(t["name"] == "Risk desk" for t in data["teams"])
    assert any(n["title"] == "Pricing floor" for n in data["notes"])
    assert data["users"] and data["users"][0]["email"] == "owner@acme.example"
    assert data["counts"]["notes"] >= 1

    flat = r.text.lower()
    for secret in ("password_hash", "token_hash", "mfa_secret", "mfa_recovery", "stripe_secret"):
        assert secret not in flat, secret


def test_export_summary_reports_counts(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    s = c.get("/api/org/export/summary").json()
    assert s["tables"] >= 5 and s["rows"] >= 1 and "never included" in s["note"]
    assert s["counts"]["users"] == 1


def test_export_requires_an_account(tmp_path, monkeypatch):
    fresh(tmp_path, monkeypatch)
    anon = TestClient(main.app)
    assert anon.get("/api/org/export").status_code == 401
    assert anon.get("/api/org/export/summary").status_code == 401
