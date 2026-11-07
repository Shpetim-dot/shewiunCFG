"""Wave 3 batch 15 — flat enterprise MCP / apps connector.

Pins the user feedback: the sidebar "Connect apps" surface and the connector modal are flat
(solid surfaces, 1 px lines, no gradient/filter/glow), there is no green status dot or green
button, status colour is restrained and semantic, and connector actions update the DOM in place
instead of rebuilding the whole modal. Existing HTTP behaviour is covered by
``tests/test_wave2_connector.py``; this file adds static markup/CSS assertions plus a small
contract smoke test so the endpoints stay wired.
"""
from fastapi.testclient import TestClient

from app import main


def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "d15.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_BILLING",
                "CFA_PLAN", "CFA_SECRET_KEY", "CFA_MCP_ALLOW_PRIVATE", "CFA_MCP_ALLOW_INSECURE"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_API_KEYS", "")
    main.init_db()
    return TestClient(main.app)


def css_block(css: str, start: str, end: str | None = None) -> str:
    i = css.index(start)
    return css[i:css.index(end)] if end else css[i:]


# ---------- served app.js: flat sidebar + connector surface ----------

def test_sidebar_connect_button_is_flat_and_neutral(tmp_path, monkeypatch):
    js = client(tmp_path, monkeypatch).get("/static/app.js").text
    for marker in (
        "'appsbtn mcp3-connect'",
        "mcp3-connect-ic",
        "mcp3-connect-txt",
        "mcp3-connect-count",
        "connected · MCP",
        "'Connect apps'",
        "onclick: openApps",
    ):
        assert marker in js, f"missing marker: {marker}"
    # the old gradient surface with green status dot is gone
    for gone in ("av3-mcp", "av3-dot", "av3-mcp-txt", "av3-mcp-badge"):
        assert gone not in js, f"old markup still present: {gone}"


def test_connector_modal_flat_markers(tmp_path, monkeypatch):
    js = client(tmp_path, monkeypatch).get("/static/app.js").text
    for marker in (
        "mcp3-modal",
        "mcp3-head",
        "mcp3-tabs",
        "mcp3-count-chip",
        "mcp3-card",
        "mcp3-tag",
        "mcp3-cta",
        "mcp3-primary",
        "mcp3-skel",
        "mcp3-legend",
        "mcp3-matrix-wrap",
        "mcp3-try",
        "mcp3-add-grid",
        "mcp-notice",
    ):
        assert marker in js, f"missing marker: {marker}"
    # structure and copy stay the same as wave 2
    for marker in ("'Catalog'", "'My connectors'", "'Add MCP server'", "'Agent tool grants'",
                   "'Try a call'", "'All read'", "'Manage grants'", "'Search connectors'",
                   "Secret-looking tools can never be granted", "'No connectors yet'"):
        assert marker in js, f"missing behaviour marker: {marker}"
    # no green dot class or status-coloured button markup in the connector code
    connector = js[js.index("function appsModal() {"):js.index("function agentModal() {")]
    assert "av3-dot" not in connector
    assert "#6EE7B7" not in connector
    # the only semantic green in the new surface is the tiny muted tag dot (CSS side)


def test_connector_actions_patch_dom_instead_of_rebuilding(tmp_path, monkeypatch):
    js = client(tmp_path, monkeypatch).get("/static/app.js").text
    for marker in ("const paintNotice", "const applyFilter", "const runAction", "const actionBtn",
                   "if (opts.reload) refresh(); else paintNotice();", "aria-busy",
                   "document.getElementById('mcp-notice')"):
        assert marker in js, f"missing in-place update marker: {marker}"
    # search filters the rendered cards in place (keeps caret, no overlay rebuild)
    assert "searchEl.addEventListener('input', () => { S.appQ = searchEl.value; applyFilter(); });" in js
    # grant save updates the local grant map instead of refetching/re-rendering the modal
    assert "a.grants[b.id] = r.tools || [];" in js
    # lazy state names used by the overlay remain
    for marker in ("S.appTab", "S.mcpBusy", "S.mcpNote", "S.appsLoading"):
        assert marker in js


def test_connector_endpoints_still_wired(tmp_path, monkeypatch):
    js = client(tmp_path, monkeypatch).get("/static/app.js").text
    for marker in (
        "/api/apps/${a.id}/connect",
        "/api/apps/${a.id}/disconnect",
        "/api/mcp/servers/${a.id}/refresh",
        "/api/mcp/servers",
        "`/api/bots/${b.id}/apps/${a.id}`",
        "`/api/bots/${t.bot}/tools`",
        "method: 'DELETE'",
    ):
        assert marker in js, f"missing endpoint: {marker}"
    # old one-scroll modal / no-longer-used labels stay gone
    for gone in ("Apps (MCP)", "Connect (demo)", "'Search apps'", "Run as this agent"):
        assert gone not in js


# ---------- served style.css: flat, no gradients, no green dot ----------

def test_css_side_connect_button_is_flat(tmp_path, monkeypatch):
    css = client(tmp_path, monkeypatch).get("/static/style.css").text
    assert "/* ===== Batch 15 — Connector polish ===== */" in css
    assert ".appsbtn.av3-mcp" not in css, "old gradient sidebar rule still present"
    assert ".av3-dot" not in css, "green status dot rule still present"
    rule_start = css.index(".appsbtn.mcp3-connect {")
    rule = css[rule_start:css.index("}", rule_start) + 1]
    assert "border: 1px solid var(--line)" in rule
    assert "background: var(--surface)" in rule
    assert "box-shadow: none" in rule and "filter: none" in rule
    assert "linear-gradient" not in rule
    hover_start = css.index(".appsbtn.mcp3-connect:hover {")
    hover = css[hover_start:css.index("}", hover_start) + 1]
    assert "linear-gradient" not in hover and "filter: none" in hover


def test_css_batch15_block_has_no_gradient_or_glow(tmp_path, monkeypatch):
    css = client(tmp_path, monkeypatch).get("/static/style.css").text
    block = css_block(css, "/* ===== Batch 15 — Connector polish ===== */")
    assert "linear-gradient" not in block and "radial-gradient" not in block
    for marker in (".mcp3-connect", ".mcp3-tabs", ".mcp3-tag-dot", ".mcp3-skel", ".mcp3-card[hidden]",
                   ".mcp3-primary", ".mcp3-cta", "@keyframes mcp3SkelPulse",
                   "prefers-reduced-motion: reduce"):
        assert marker in block, f"missing CSS marker: {marker}"
    assert "@media (prefers-color-scheme: dark)" in block
    assert "@media (max-width: 760px)" in block
    assert "--panel" not in block, "undefined --panel token must not be used"
    # neutral segmented tabs + restrained status chips
    assert '.mcp3-tabs button[aria-selected="true"]' in block
    assert ".mcp3-tag-dot" in block and "#3D7A4F" in block
    assert ".mcp3-tag.warn" in block


def test_css_connector_blocks_are_gradient_free(tmp_path, monkeypatch):
    css = client(tmp_path, monkeypatch).get("/static/style.css").text
    batch9 = css_block(css, "/* ===== Batch 9 — Connector ===== */", "/* ===== Batch 10")
    assert "linear-gradient" not in batch9
    assert "#6EE7B7" not in batch9
    # classes that the wave-2 connector test pins must survive the rework
    for marker in (".mcp-modal", ".mcp-tabs", ".mcp-grid", ".mcp-matrix", ".mcp-switch",
                   ".mcp-track", ".mcp-knob", ".mcp-facts", ".mcp-empty"):
        assert marker in css, f"wave-2 CSS marker lost: {marker}"
    assert ".mcp3-tabs" in css


# ---------- contract smoke test (behaviour itself is pinned by test_wave2_connector) ----------

def test_catalog_contract_unchanged(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    apps = c.get("/api/apps").json()
    assert len(apps) == 9
    for a in apps:
        assert {"id", "name", "category", "description", "connected", "live", "tools", "grants"} <= set(a)
        assert all(t["risk"] in ("read", "write", "secret") for t in a["tools"])
    by_id = {a["id"]: a for a in apps}
    assert by_id["1password"]["tools"][-1] == {"name": "read_secret", "risk": "secret"}
    # connect -> grant -> disconnect still works and keeps the audit trail
    assert c.post("/api/apps/datadog/connect").json()["connected"] is True
    bot = c.get("/api/bots").json()[0]["id"]
    assert c.put(f"/api/bots/{bot}/apps/datadog", json={"tools": ["query_metrics"]}).status_code == 200
    assert c.post("/api/apps/datadog/disconnect").json()["connected"] is False
    types = [e["event_type"] for e in c.get("/api/security/audit?limit=50").json()["events"]]
    assert "app.connected" in types and "app.disconnected" in types and "agent.grants.changed" in types
