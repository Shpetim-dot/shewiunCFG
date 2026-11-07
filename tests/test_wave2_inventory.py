"""Wave 2, batch 10 — Inventory v2.

Contract tests for the additive `model` / `model_configured` inventory fields and the dashboard
data, plus static-content checks on the served SPA (the dashboard, the compact list with model
technical data, the preserved rights panel and bulk actions, and the marked CSS block).
"""
from fastapi.testclient import TestClient

from app import cfa_core
from app import main

INVENTORY_KEYS = {
    "id", "name", "team", "role", "icon", "color", "source", "source_ref", "trust", "status",
    "criticality", "owner", "sponsor", "purpose", "last_activity", "accountability", "created_at",
    "scopes", "tool_grants", "write_grants", "risk", "model", "model_configured",
}
SUMMARY_KEYS = {"total", "ownerless", "no_sponsor", "no_purpose", "suspended", "high_risk"}
RISK_LEVELS = {"low", "medium", "high", "suspended"}
CSS_MARKER = "/* ===== Batch 10 — Inventory v2 ===== */"
BATCH1_CSS_MARKER = "/* ===== Batch 1 — Inventory ===== */"


def client(tmp_path, monkeypatch, name="c10.db", keys=""):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / name)
    for env in ("CFA_MODEL_API_KEY", "HF_TOKEN", "CFA_HF_TOKEN", "CFA_MODEL_NAME",
                "ANTHROPIC_API_KEY", "CFA_ANTHROPIC_KEY", "GEMINI_API_KEY", "CFA_GEMINI_KEY", "GOOGLE_API_KEY"):
        monkeypatch.delenv(env, raising=False)
    monkeypatch.setenv("CFA_API_KEYS", keys)
    main.init_db()
    return TestClient(main.app)


def inventory_js_region(js):
    """The inventory block of app.js: section marker to the marketplace import helper."""
    start = js.index("// ---------- inventory: derived trust ring")
    end = js.index("const importAgent = ", start)
    return js[start:end]


def by_id(rows):
    return {r["id"]: r for r in rows}


# ---------- additive backend contract: model technical data ----------
def test_inventory_model_fields_are_honest_and_reflect_model_live(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    assert c.post("/api/demo/workspace").status_code == 200
    inv = c.get("/api/inventory").json()
    assert inv
    for row in inv:
        assert set(row) == INVENTORY_KEYS
        assert isinstance(row["model"], str)
        assert isinstance(row["model_configured"], bool)
        assert not row["model_configured"] or row["model"]
        # The flag is exactly "a model is set AND its provider key is available".
        assert row["model_configured"] == (bool(row["model"]) and cfa_core.model_live(row["model"]))
    # The demo workspace seeds no per-agent models, so nothing pretends to be configured.
    assert all(row["model"] == "" and row["model_configured"] is False for row in inv)


def test_model_configured_turns_on_with_a_key_and_respects_provider_keys(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    bot = c.post("/api/bots", json={"template": "custom", "name": "Local Model Agent", "model": "qa-model"}).json()
    rows = by_id(c.get("/api/inventory").json())
    assert rows[bot["id"]]["model"] == "qa-model"
    assert rows[bot["id"]]["model_configured"] is False
    # The same bot flips to configured once the default endpoint key exists, without touching the model.
    monkeypatch.setenv("CFA_MODEL_API_KEY", "test-key")
    rows = by_id(c.get("/api/inventory").json())
    assert rows[bot["id"]]["model_configured"] is True
    assert all(r["model_configured"] is False for r in rows.values() if r["id"] != bot["id"])
    # A Hugging Face model needs HF_TOKEN, not the default key.
    r = c.put(f"/api/bots/{bot['id']}/model", json={"model": "hf:test/model"})
    assert r.status_code == 200
    rows = by_id(c.get("/api/inventory").json())
    assert rows[bot["id"]]["model"] == "hf:test/model"
    assert rows[bot["id"]]["model_configured"] is False
    monkeypatch.setenv("HF_TOKEN", "hf-test-token")
    rows = by_id(c.get("/api/inventory").json())
    assert rows[bot["id"]]["model_configured"] is True
    # Clearing the model removes both the id and the flag (the UI then says "Model must be configured").
    assert c.put(f"/api/bots/{bot['id']}/model", json={"model": ""}).status_code == 200
    row = by_id(c.get("/api/inventory").json())[bot["id"]]
    assert row["model"] == "" and row["model_configured"] is False


def test_summary_stays_consistent_and_high_risk_is_still_counted(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    before = c.get("/api/inventory/summary").json()
    assert set(before) == SUMMARY_KEYS
    # A finance template scores 5 risk points: payments + memory writes + approval requests.
    created = c.post("/api/bots", json={"template": "finance-analyst", "name": "Payments Proposer"})
    assert created.status_code == 201
    bot_id = created.json()["id"]
    inv = c.get("/api/inventory").json()
    row = by_id(inv)[bot_id]
    assert row["risk"]["level"] == "high" and row["risk"]["score"] >= 4
    summ = c.get("/api/inventory/summary").json()
    assert set(summ) == SUMMARY_KEYS
    assert summ["high_risk"] == before["high_risk"] + 1
    assert summ["high_risk"] == sum(r["risk"]["level"] == "high" for r in inv)
    assert summ["total"] == len(inv)
    assert summ["total"] == before["total"] + 1
    # Suspended agents leave the high-risk count because risk.level becomes "suspended".
    assert c.post(f"/api/bots/{bot_id}/status", json={"status": "suspended"}).status_code == 200
    after = c.get("/api/inventory/summary").json()
    assert after["high_risk"] == before["high_risk"]
    assert after["suspended"] == before["suspended"] + 1


# ---------- the mutations the dashboard rows and the rights panel still use ----------
def test_inventory_mutations_remain_audited(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    before = c.get("/api/inventory/summary").json()
    bot = c.post("/api/bots", json={"template": "compliance-reviewer", "name": "Read Only Reviewer"}).json()
    bid = bot["id"]
    assert c.post(f"/api/bots/{bid}/status", json={"status": "suspended", "reason": "inventory v2 test"}).json() == {"id": bid, "status": "suspended"}
    inv = by_id(c.get("/api/inventory").json())
    assert inv[bid]["status"] == "suspended" and inv[bid]["risk"]["level"] == "suspended"
    assert c.post(f"/api/bots/{bid}/status", json={"status": "active"}).json()["status"] == "active"
    assert c.post(f"/api/bots/{bid}/trust", json={"trust": "unverified"}).json() == {"id": bid, "trust": "unverified"}
    assert c.put(f"/api/bots/{bid}/meta", json={"criticality": "high"}).json() == {"id": bid, "criticality": "high"}
    r = c.patch(f"/api/bots/{bid}/accountability", json={"owner": "Ada", "sponsor": "Bo", "purpose": "Reviews policies"})
    assert r.status_code == 200 and r.json()["gaps"] == []
    assert c.get("/api/inventory/summary").json()["ownerless"] == before["ownerless"]
    # Unknown enum values are still rejected; the UI never sends them.
    assert c.post(f"/api/bots/{bid}/status", json={"status": "bogus"}).status_code == 422
    assert c.post(f"/api/bots/{bid}/trust", json={"trust": "maybe"}).status_code == 422
    assert c.put(f"/api/bots/{bid}/meta", json={"criticality": "critical"}).status_code == 422
    events = {e["event_type"] for e in c.get("/api/security/audit?limit=100").json()["events"]}
    assert {"agent.suspended", "agent.resumed", "agent.trust.changed", "agent.meta.changed", "agent.accountability"} <= events


# ---------- static content: dashboard, compact list, model data, preserved panel/bulk ----------
def test_static_app_js_has_dashboard_charts_list_and_model_markers(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    region = inventory_js_region(js)
    assert "function inventoryView()" in region
    # Dashboard aggregates and the four real SVG charts (no fake time series).
    for marker in ("inv2Dashboard", "inv2-dash", "inv2-kpis", "inv2-kpi", "inv2-coverage", "inv2-charts", "inv2Chart(", "inv2Bars(", "inv2Donut(", "inv2MiniBar(", "inv2StackBar("):
        assert marker in region, marker
    for title in ("Risk distribution", "Trust mix", "Team distribution", "Model coverage", "Accountability"):
        assert title in region, title
    assert "sadd(" in region and "svg(" in region
    # Compact list with avatar tiles, technical model data and the honest missing-model copy.
    for marker in ("inv2-table", "inv2-model", "Model must be configured", "model_configured", "inv2Channel", "tile(a, 32)", "invTrust(a)", "no API key", "ready"):
        assert marker in region, marker
    assert "h('table'" in region or 'h("table"' in region
    # Old card grid is gone from the inventory block (it lives on only in the batch-1 CSS history).
    assert "inv-grid" not in region and "'inv-card'" not in region
    # Preserved search, filters, counter, bulk actions, rights panel and accountability form.
    for marker in ("'Search agents'", "aria-pressed", "Clear filters", "'Select all filtered agents'", "inv-bulk", "'Suspend selected'", "'Resume selected'", "Promise.allSettled", "invPrune", "inv-aside", "'Scopes'", "'Capabilities'", "'Memory spaces'", "'App and tool grants'", "S.invEdit", "S.invRights", "invRefresh"):
        assert marker in region, marker
    # Data comes from the existing endpoints only.
    for path in ("/api/inventory", "/api/inventory/summary", "/api/bots", "/api/apps", "/api/templates", "/accountability", "/status", "/trust", "/meta"):
        assert path in region, path
    assert "S.invSum" in region
    # English-only copy in the inventory block.
    for german in (" und ", " nicht", "wird ", "Modell", "Agenten", "Anzahl"):
        assert german not in region, german


def test_static_css_has_batch10_block(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    r = c.get("/static/style.css")
    assert r.status_code == 200
    css = r.text
    assert CSS_MARKER in css
    idx = css.index(CSS_MARKER)
    assert idx > css.index(BATCH1_CSS_MARKER), "batch 10 block is appended after the earlier batch blocks"
    assert css.rstrip().endswith("}"), "the batch 10 block is the tail of the stylesheet"
    block = css[idx:]
    assert block.strip().startswith(CSS_MARKER)
    for selector in (".inv2-view", ".inv2-head", ".inv2-dash", ".inv2-kpis", ".inv2-kpi", ".inv2-coverage", ".inv2-cov",
                     ".inv2-charts", ".inv2-chart", ".inv2-donut", ".inv2-bars", ".inv2-legend", ".inv2-table", ".inv2-model",
                     ".inv2-aside", ".inv2-empty", ".inv2-bulk"):
        assert selector in block, selector
    assert "@media (max-width: 1080px)" in block
    assert "@media (max-width: 760px)" in block
    assert "inv2-table thead { display: none" in block  # mobile stacked rows
    assert "var(--surface)" in block
    assert "var(--panel" not in block  # the undefined variable that breaks dark mode
    assert ".inv2-" not in css[:idx], "batch 10 classes must live only in the marked block"
