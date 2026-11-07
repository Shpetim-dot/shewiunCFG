"""Batch 1 — inventory revamp.

HTTP contract tests for the endpoints the card inventory, the rights panel and the bulk actions
depend on, plus static-content checks on the served app.js / style.css (the SPA has no bundler, so
the served files are the only source of truth for pure frontend behaviour).
"""
from fastapi.testclient import TestClient

from app import main

INVENTORY_KEYS = {
    "id", "name", "team", "role", "icon", "color", "source", "source_ref", "trust", "status",
    "criticality", "owner", "sponsor", "purpose", "last_activity", "accountability", "created_at",
    "scopes", "tool_grants", "write_grants", "risk", "model", "model_configured",
}
SUMMARY_KEYS = {"total", "ownerless", "no_sponsor", "no_purpose", "suspended", "high_risk"}
RISK_LEVELS = {"low", "medium", "high", "suspended"}
CAPABILITIES = ["memory.read", "memory.write", "call.join", "approval.request", "payments.propose"]
CSS_MARKER = "/* ===== Batch 1 — Inventory ===== */"


def client(tmp_path, monkeypatch, name="b1.db", keys=""):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / name)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_API_KEYS", keys)
    main.init_db()
    return TestClient(main.app)


def inventory_js_region(js):
    """The rewritten inventory block of app.js, from its own section marker to the marketplace import helper."""
    start = js.index("// ---------- inventory: derived trust ring")
    end = js.index("const importAgent = ", start)
    return js[start:end]


# ---------- HTTP contracts ----------
def test_inventory_returns_every_field_the_cards_render(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    assert c.post("/api/demo/workspace").status_code == 200
    r = c.get("/api/inventory")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and items
    for item in items:
        assert set(item) == INVENTORY_KEYS
        assert isinstance(item["id"], str) and item["id"]
        assert isinstance(item["name"], str) and item["name"]
        assert isinstance(item["team"], str) and item["team"]
        assert isinstance(item["source"], str) and item["source"]
        assert item["source_ref"] is None or isinstance(item["source_ref"], str)
        assert item["trust"] in {"verified", "unverified"}
        assert item["status"] in {"active", "suspended"}
        assert item["criticality"] in {"low", "medium", "high"}
        assert isinstance(item["owner"], str) and item["owner"]
        assert isinstance(item["sponsor"], str) and isinstance(item["purpose"], str)
        assert item["last_activity"] is None or isinstance(item["last_activity"], str)
        assert isinstance(item["accountability"], list)
        assert set(item["accountability"]) <= {"no_owner", "no_sponsor", "no_purpose"}
        assert isinstance(item["scopes"], int) and item["scopes"] >= 0
        assert isinstance(item["tool_grants"], int) and item["tool_grants"] >= 0
        assert isinstance(item["write_grants"], int) and 0 <= item["write_grants"] <= item["tool_grants"]
        # Wave-2 batch 10 added the technical model fields; they are part of the contract now.
        assert isinstance(item["model"], str)
        assert isinstance(item["model_configured"], bool)
        assert not item["model_configured"] or item["model"]
        risk = item["risk"]
        assert set(risk) == {"level", "score", "reasons"}
        assert risk["level"] in RISK_LEVELS
        assert isinstance(risk["score"], int) and 0 <= risk["score"]
        assert isinstance(risk["reasons"], list) and all(isinstance(x, str) for x in risk["reasons"])


def test_summary_numbers_match_the_inventory_rows(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    c.post("/api/demo/workspace")
    inv = c.get("/api/inventory").json()
    summ = c.get("/api/inventory/summary").json()
    assert set(summ) == SUMMARY_KEYS
    assert summ["total"] == len(inv)
    assert summ["ownerless"] == sum("no_owner" in r["accountability"] for r in inv)
    assert summ["no_sponsor"] == sum("no_sponsor" in r["accountability"] for r in inv)
    assert summ["no_purpose"] == sum("no_purpose" in r["accountability"] for r in inv)
    assert summ["suspended"] == sum(r["status"] == "suspended" for r in inv)
    assert summ["high_risk"] == sum(r["risk"]["level"] == "high" for r in inv)


def test_high_risk_summary_counts_genuinely_high_risk_agents(tmp_path, monkeypatch):
    """Regression: summary used to compare the risk dict to strings, so high_risk was always 0."""
    c = client(tmp_path, monkeypatch)
    before = c.get("/api/inventory/summary").json()
    created = c.post("/api/bots", json={"template": "finance-analyst", "name": "Payments Proposer"})
    assert created.status_code == 201
    bot_id = created.json()["id"]
    inv = {r["id"]: r for r in c.get("/api/inventory").json()}
    row = inv[bot_id]
    assert row["risk"]["level"] == "high"
    assert row["risk"]["score"] >= 4
    assert "can propose payments" in row["risk"]["reasons"]
    summ = c.get("/api/inventory/summary").json()
    assert summ["high_risk"] == before["high_risk"] + 1
    assert summ["high_risk"] >= 1
    assert summ["high_risk"] == sum(r["risk"]["level"] == "high" for r in inv.values())
    # Suspending switches the agent's risk level to suspended, so it leaves the high-risk count.
    assert c.post(f"/api/bots/{bot_id}/status", json={"status": "suspended"}).status_code == 200
    after = c.get("/api/inventory/summary").json()
    assert after["high_risk"] == before["high_risk"]
    assert after["suspended"] == before["suspended"] + 1


def test_rights_panel_data_comes_from_bots_apps_and_templates(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    c.post("/api/demo/workspace")
    bots = c.get("/api/bots").json()
    apps = c.get("/api/apps").json()
    templates = c.get("/api/templates").json()
    caps = next(x["capabilities"] for x in templates if "capabilities" in x)
    assert caps == CAPABILITIES
    assert all(isinstance(b["scopes"], list) and isinstance(b["spaces"], list) for b in bots)
    pivoted = []
    for app in apps:
        assert isinstance(app["grants"], dict)
        risk_by_tool = {t["name"]: t["risk"] for t in app["tools"]}
        for bot_id, tools in app["grants"].items():
            assert isinstance(tools, list)
            for name in tools:
                assert name in risk_by_tool
                pivoted.append((bot_id, app["id"], name, risk_by_tool[name]))
    assert pivoted, "the demo workspace must grant at least one tool so the rights panel is testable"
    assert all(risk in {"read", "write", "secret"} for *_, risk in pivoted)
    inv = {r["id"]: r for r in c.get("/api/inventory").json()}
    per_bot = {}
    for bot_id, _app, _tool, _risk in pivoted:
        per_bot[bot_id] = per_bot.get(bot_id, 0) + 1
    for bot_id, n in per_bot.items():
        assert inv[bot_id]["tool_grants"] == n


def test_inventory_actions_used_by_the_rights_panel_and_bulk_actions(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    before = c.get("/api/inventory/summary").json()
    bot = c.post("/api/bots", json={"template": "compliance-reviewer", "name": "Read Only Reviewer"}).json()
    bid = bot["id"]
    # Suspend / resume (rights panel and "Suspend selected" / "Resume selected").
    r = c.post(f"/api/bots/{bid}/status", json={"status": "suspended", "reason": "inventory test"})
    assert r.status_code == 200 and r.json() == {"id": bid, "status": "suspended"}
    inv = {x["id"]: x for x in c.get("/api/inventory").json()}
    assert inv[bid]["status"] == "suspended" and inv[bid]["risk"]["level"] == "suspended"
    assert c.get("/api/inventory/summary").json()["suspended"] == before["suspended"] + 1
    assert c.post(f"/api/bots/{bid}/status", json={"status": "active"}).json()["status"] == "active"
    # Trust toggle (rights panel and "Mark verified").
    r = c.post(f"/api/bots/{bid}/trust", json={"trust": "unverified"})
    assert r.status_code == 200 and r.json() == {"id": bid, "trust": "unverified"}
    inv = {x["id"]: x for x in c.get("/api/inventory").json()}
    assert inv[bid]["trust"] == "unverified"
    assert "unverified source" in inv[bid]["risk"]["reasons"]
    assert c.post(f"/api/bots/{bid}/trust", json={"trust": "verified"}).json()["trust"] == "verified"
    # Criticality select.
    r = c.put(f"/api/bots/{bid}/meta", json={"criticality": "high"})
    assert r.status_code == 200 and r.json() == {"id": bid, "criticality": "high"}
    assert inv[bid]["risk"]["level"] in RISK_LEVELS
    # Accountability form (PATCH + audit trail).
    r = c.patch(f"/api/bots/{bid}/accountability", json={"owner": "Ada", "sponsor": "Bo", "purpose": "Reviews policies"})
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == bid and body["owner"] == "Ada" and body["gaps"] == []
    assert c.get("/api/inventory/summary").json()["ownerless"] == before["ownerless"]
    # Input validation stays honest: the UI never sends an unknown enum.
    assert c.post(f"/api/bots/{bid}/status", json={"status": "bogus"}).status_code == 422
    assert c.post(f"/api/bots/{bid}/trust", json={"trust": "maybe"}).status_code == 422
    assert c.put(f"/api/bots/{bid}/meta", json={"criticality": "critical"}).status_code == 422
    events = {e["event_type"] for e in c.get("/api/security/audit?limit=100").json()["events"]}
    assert {"agent.suspended", "agent.resumed", "agent.trust.changed", "agent.meta.changed", "agent.accountability"} <= events


# ---------- static content: the served SPA files are the frontend contract ----------
def test_inventory_surface_keeps_trust_panel_and_bulk_contracts(tmp_path, monkeypatch):
    """Batch 1 invariants survive the batch-10 dashboard/list redesign."""
    c = client(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    region = inventory_js_region(js)
    assert "function inventoryView()" in region
    # SVG trust ring and the exact formula it derives from API fields.
    for marker in ("inv-trust", "inv-ring", "stroke-dasharray", "role: 'img'", "Trust score ${score} of 100", "const INV_TRUST_RULE"):
        assert marker in region, marker
    assert "minus 35 if unverified" in region
    assert "minus 6 x risk score" in region
    assert "minus 8 x accountability gap" in region
    assert "suspended agent scores 0" in region
    assert "100 - (a.trust === 'unverified' ? 35 : 0) - 6 *" in region
    assert "- 8 * ((a.accountability || []).length)" in region
    assert "score >= 80" in region and "score >= 60" in region
    assert "INV_GREEN = '#3D7A4F'" in region and "INV_AMBER = '#B7791F'" in region
    # Filters and search with caret preservation.
    assert "'Search agents'" in region
    assert "aria-pressed" in region
    assert "inv-filter-row" in region
    assert "Clear filters" in region
    assert "'Select all filtered agents'" in region
    assert " of " in region  # "N of M" counter
    # Rights panel: real permissions from /api/bots, /api/apps and /api/templates.
    for marker in ("inv-aside", "'Scopes'", "'Capabilities'", "'Memory spaces'", "'App and tool grants'", "Edit accountability", "Suspend agent", "Resume agent", "Mark verified", "Mark unverified"):
        assert marker in region, marker
    for path in ("/api/bots", "/api/apps", "/api/templates", "/api/inventory", "/api/inventory/summary", "/accountability", "/status", "/trust", "/meta"):
        assert path in region, path
    assert "S.invPick" in region and "S.invRights" in region
    # Bulk actions over the existing per-agent endpoints, with pruning after reload.
    for marker in ("inv-bulk", "'Suspend selected'", "'Resume selected'", "Promise.allSettled", "disabled: !!S.invBulk", "S.invBulk = false", "invPrune"):
        assert marker in region, marker
    assert "accountabilityForm" in region


def test_inventory_css_block_is_marked_responsive_and_dark_mode_safe(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    r = c.get("/static/style.css")
    assert r.status_code == 200
    css = r.text
    assert CSS_MARKER in css
    idx = css.index(CSS_MARKER)
    assert ".inv-" not in css[:idx], "inventory classes must only live in the marked block"
    block = css[idx:]
    assert block.strip().startswith(CSS_MARKER)
    for selector in (".inv-grid", ".inv-card", ".inv-aside", ".inv-trust", ".inv-bulk", ".inv-stats", ".inv-filters", ".inv-legend", ".inv-cap", ".inv-grant", ".inv-fact"):
        assert selector in block, selector
    assert "@media (max-width: 760px)" in block
    assert "@media (max-width: 1080px)" in block
    assert "prefers-color-scheme: dark" in block
    assert "var(--surface)" in block  # no undefined var(--panel) trap in dark mode
    assert "var(--panel" not in block
