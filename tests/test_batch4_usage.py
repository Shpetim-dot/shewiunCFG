"""Batch 4 — Models & usage: usage report fields, provider card shape, billing plan limits, static screen markers."""
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import cfa_core as pf
from app import main


def fresh(tmp_path, monkeypatch, **env):
    """Fresh DB in anonymous dev mode (everything is admin, no CSRF)."""
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "b4.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY",
                "CFA_BILLING", "CFA_PLAN", "CFA_SECRET_KEY", "STRIPE_SECRET_KEY",
                "CFA_MCP_ALLOW_PRIVATE", "CFA_MCP_ALLOW_INSECURE"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_DEMO_DELAY", "0")
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def seed_usage():
    """Three calls: two priced chat calls for one model and one fallback research call for another."""
    now = datetime.now(timezone.utc).isoformat()
    rows = [
        ("u1", now, "openai", "gpt-x", "gpt-x", 0, "chat", "strategist", 1000, 500, 120, "ok", "", 0.0003, "USD", "default"),
        ("u2", now, "openai", "gpt-x", "gpt-x", 0, "chat", "strategist", 200, 100, 80, "ok", "", None, None, "default"),
        ("u3", now, "anthropic", "claude-y", "claude-y", 1, "research", None, 300, 150, 200, "ok", "", 0.0004, "USD", "default"),
    ]
    with pf.db() as con:
        con.executemany(
            "INSERT INTO llm_usage (id,ts,provider,model,requested_model,fallback,kind,bot_id,tokens_in,tokens_out,"
            "latency_ms,status,error,cost,currency,org_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        con.commit()
    return now


def test_usage_report_exposes_tokens_cost_and_daily_series(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    now = seed_usage()
    u = c.get("/api/usage?days=30").json()

    assert u["days"] == 30
    assert [m["model"] for m in u["models"]] == ["gpt-x", "claude-y"]  # API sorts by calls

    row = u["models"][0]
    assert row["provider"] == "openai" and row["calls"] == 2 and row["ok"] == 2 and row["errors"] == 0
    assert row["tokens_in"] == 1200 and row["tokens_out"] == 600
    assert row["avg_latency_ms"] == 100
    assert row["cost"] == pytest.approx(0.0003)
    assert row["currency"] == "USD"
    assert row["calls_with_unknown_cost"] == 1  # one ok call has no price record
    assert row["fallback_calls"] == 0

    fallback = u["models"][1]
    assert fallback["model"] == "claude-y" and fallback["fallback_calls"] == 1 and fallback["calls"] == 1
    assert fallback["cost"] == pytest.approx(0.0004)

    assert u["cost_is_partial"] is True
    assert "Tokens come from the provider's usage data" in u["note"]
    assert u["daily"] and u["daily"][-1]["day"] == now[:10]
    assert u["daily"][-1]["calls"] == 3 and u["daily"][-1]["tokens_in"] == 1500 and u["daily"][-1]["tokens_out"] == 750
    assert u["daily"][-1]["cost"] == pytest.approx(0.0007)
    assert u["by_kind"] == {"chat": 2, "research": 1}
    assert u["budget"]["monthly_cap"] is None
    assert u["budget"]["spent_this_month_known_cost"] == pytest.approx(0.0007)
    assert u["fallback_models"] == []


def test_usage_budget_is_returned_with_the_report(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    assert c.put("/api/usage/budget", json={"amount": 12.5, "currency": "EUR"}).status_code == 200
    u = c.get("/api/usage").json()
    assert u["budget"]["monthly_cap"] == {"amount": 12.5, "currency": "EUR"}
    assert c.put("/api/usage/budget", json={"amount": 0, "currency": "EUR"}).status_code == 200
    # Documented backend behaviour this screen keeps: a zero amount clears the cap, it is not stored as zero.
    assert c.get("/api/usage").json()["budget"]["monthly_cap"] is None


def test_empty_usage_report_is_honest(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    u = c.get("/api/usage").json()
    assert u["models"] == [] and u["daily"] == [] and u["by_kind"] == {}
    assert u["cost_is_partial"] is False
    assert u["budget"]["monthly_cap"] is None and u["fallback_models"] == []


def test_providers_report_key_presence_and_missing_secret_key(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    with pf.db() as con:
        con.execute("INSERT INTO providers (id,name,base_url,key_enc,created_by,created_at,last_test,last_status,org_id) "
                    "VALUES ('mistral','Mistral AI','https://api.mistral.ai/v1',NULL,'test',?,NULL,NULL,'default')",
                    (datetime.now(timezone.utc).isoformat(),))
        con.commit()
    provs = c.get("/api/providers").json()
    assert len(provs) == 1
    p = provs[0]
    assert set(p) == {"id", "name", "base_url", "has_key", "last_test", "status", "model_prefix"}
    assert p["id"] == "mistral" and p["has_key"] is False and p["status"] == "untested"
    assert p["model_prefix"] == "mistral:" and p["base_url"] == "https://api.mistral.ai/v1"

    # Adding a provider needs CFA_SECRET_KEY; the API says so and the UI shows that error verbatim.
    monkeypatch.setenv("CFA_MCP_ALLOW_PRIVATE", "1")  # skip the DNS/SSRF probe, the route still needs the key
    r = c.post("/api/providers", json={"id": "acme", "base_url": "https://api.acme.example/v1", "api_key": "12345678"})
    assert r.status_code == 409
    assert "CFA_SECRET_KEY" in r.json()["detail"]


def test_billing_plan_limits_are_exposed_when_enabled(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch, CFA_BILLING="on")
    b = c.get("/api/billing").json()
    assert b["enabled"] is True
    assert b["plan"] == "free" and b["plan_name"] == "Free" and b["status"] == "active"
    assert [p["id"] for p in b["plans"]] == ["free", "starter", "professional", "enterprise"]
    assert [p["price_eur"] for p in b["plans"]] == [0, 29, 99, None]
    assert b["limits"]["seats"] == 3
    assert {"seats", "agents", "messages", "calls", "research", "api_calls", "uploads", "mcp_servers",
            "storage_mb"} <= set(b["limits"])
    assert set(b["usage"]) == {"agents", "messages", "calls", "research", "uploads", "mcp_servers", "seats",
                               "api_calls", "storage_mb"}
    assert b["labels"]["seats"] == "team members"
    assert b["usage"]["seats"] == 0  # anonymous dev workspace has no users yet


def test_billing_is_off_without_the_flag(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    b = c.get("/api/billing").json()
    assert b["enabled"] is False
    assert b["plan"] == "free" and b["plan_name"] == "Free"


def test_usage_screen_serves_cards_charts_and_plan_limits(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    for marker in ("use-hero", "use-hero-main", "use-totals", "use-charts", "use-plan", "use-prov-grid",
                   "use-plan-cta", "use-table-card", "Plan limits", "Upgrade / manage plan",
                   "Calls per day", "Usage by type", "Input tokens", "Output tokens", "Known cost",
                   "calls unpriced", "Avg latency", "Fallback calls", "Key set", "No key",
                   "Billing is off on this deployment — no plan limits are enforced.",
                   "CFA_SECRET_KEY", "/api/billing", "/api/providers/${p.id}/test"):
        assert marker in js, marker
    # The old providers table and its columns are gone.
    for gone in ("Test with model", "Distribution by type", "Tokens in / out"):
        assert gone not in js, gone
    # Billing must be loaded lazily by usageView, not from the shared go() loader.
    usage_hook = next(line for line in js.splitlines() if "view === 'usage'" in line)
    assert "/api/billing" not in usage_hook


def test_usage_screen_styles_are_appended(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    css = c.get("/static/style.css").text
    assert "/* ===== Batch 4 — Models & usage ===== */" in css
    for selector in (".use-hero", ".use-totals", ".use-tile", ".use-charts", ".use-plan", ".use-prov-grid",
                     ".use-prov", ".use-bars", ".use-donut-wrap", ".use-legend", ".use-table-card"):
        assert selector in css, selector
    assert "@media (max-width: 980px)" in css and "@media (max-width: 760px)" in css
