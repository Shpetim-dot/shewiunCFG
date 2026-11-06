"""Presets: plan gating and feature differentiation."""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch, **env):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "p.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_BILLING", "CFA_PLAN"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "a@acme.example", "password": PASS, "name": "A", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def test_presets_expose_plan_and_features(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    presets = {p["id"]: p for p in c.get("/api/presets").json()}
    assert presets["freelancer"]["plan"] == "free"
    assert presets["fintech"]["plan"] == "professional"
    assert presets["startup"]["plan"] == "starter"
    assert presets["freelancer"]["features"] and presets["fintech"]["features"]
    assert presets["freelancer"]["features"] != presets["fintech"]["features"]


def test_free_plan_cannot_apply_a_professional_preset(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch, CFA_BILLING="on")
    r = c.post("/api/presets/fintech/apply", headers=csrf(c))
    assert r.status_code == 402
    detail = r.json()["detail"]
    assert detail["code"] == "limit_reached" and detail["metric"] == "plan"
    assert "Professional" in detail["message"]


def test_free_preset_applies_on_the_free_plan(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch, CFA_BILLING="on")
    r = c.post("/api/presets/freelancer/apply", headers=csrf(c))
    assert r.status_code == 201 and r.json()["created"] >= 3


def test_professional_plan_can_apply_a_professional_preset(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch, CFA_BILLING="on", CFA_PLAN="professional")
    r = c.post("/api/presets/fintech/apply", headers=csrf(c))
    assert r.status_code == 201 and r.json()["team"] == "Risk desk"


def test_plan_ranking_helper():
    from app import billing
    assert billing.plan_at_least("professional", "starter")
    assert billing.plan_at_least("enterprise", "professional")
    assert not billing.plan_at_least("free", "starter")
    assert not billing.plan_at_least("starter", "professional")
    assert billing.plan_at_least("pilot", "professional")  # legacy alias maps to enterprise
