"""Wave 2 batch 9 — MCP / apps connector v2.

Pins the HTTP contract the redesigned connect-apps overlay uses (catalog shape, connect/disconnect,
per-agent grants + audit, tool-call -> approval, live MCP add/refresh/remove with validation) and the
static markup markers of the new three-tab overlay. No network: MCP traffic goes through
``mcp_apps.TRANSPORT`` with an httpx.MockTransport.
"""
import json

import httpx
from fastapi.testclient import TestClient

from app import main
from app import mcp_apps


def client(tmp_path, monkeypatch, keys=""):
    """Anonymous dev mode by default; pass `keys` for admin/member API-key mode."""
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "mcp.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_BILLING",
                "CFA_PLAN", "CFA_SECRET_KEY", "CFA_MCP_ALLOW_PRIVATE", "CFA_MCP_ALLOW_INSECURE"):
        monkeypatch.delenv(key, raising=False)
    if keys:
        monkeypatch.setenv("CFA_API_KEYS", keys)
    else:
        monkeypatch.setenv("CFA_API_KEYS", "")
    main.init_db()
    return TestClient(main.app)


def bots(c):
    return {b["name"]: b["id"] for b in c.get("/api/bots").json()}


def apps(c):
    return {a["id"]: a for a in c.get("/api/apps").json()}


def events(c, limit=100):
    return c.get(f"/api/security/audit?limit={limit}").json()["events"]


def mock_mcp(monkeypatch, tools, calls=None):
    """In-process MCP server for the Streamable HTTP client (initialize / tools/list / tools/call)."""
    calls = calls if calls is not None else []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content or b"{}")
        calls.append(body.get("method"))
        method = body.get("method")
        if method == "initialize":
            return httpx.Response(200, json={"jsonrpc": "2.0", "id": 1, "result": {"protocolVersion": "2025-03-26", "capabilities": {}, "serverInfo": {"name": "fake", "version": "1"}}})
        if method == "tools/list":
            return httpx.Response(200, json={"jsonrpc": "2.0", "id": 2, "result": {"tools": tools}})
        if method == "tools/call":
            return httpx.Response(200, json={"jsonrpc": "2.0", "id": 2, "result": {"content": [{"type": "text", "text": "live tool output"}]}})
        return httpx.Response(202)

    monkeypatch.setattr(mcp_apps, "TRANSPORT", httpx.MockTransport(handler))
    return calls


LIVE_TOOLS = [
    {"name": "list_items", "description": "List items", "annotations": {"readOnlyHint": True}},
    {"name": "update_item", "description": "Update an item"},
    {"name": "read_secret", "description": "Read a secret"},
]


# ---------- catalog contract ----------

def test_catalog_shape_and_risk_classes(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    items = c.get("/api/apps").json()
    assert len(items) == 9
    for a in items:
        assert {"id", "name", "category", "description", "connected", "live", "tools", "grants"} <= set(a)
        assert isinstance(a["tools"], list)
        for t in a["tools"]:
            assert t["risk"] in ("read", "write", "secret")
    by_id = {a["id"]: a for a in items}
    assert by_id["datadog"]["live"] is False and by_id["datadog"]["connected"] is False
    assert by_id["datadog"]["tools"] == [{"name": "query_metrics", "risk": "read"}, {"name": "list_monitors", "risk": "read"}, {"name": "mute_monitor", "risk": "write"}]
    assert by_id["1password"]["tools"][-1] == {"name": "read_secret", "risk": "secret"}
    assert any(a["category"] == "Observability" for a in items)


def test_connect_disconnect_and_audit(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    r = c.post("/api/apps/datadog/connect")
    assert r.status_code == 200 and r.json() == {"id": "datadog", "connected": True, "mode": "demo"}
    assert apps(c)["datadog"]["connected"] is True
    assert any(e["event_type"] == "app.connected" and e["payload"]["app"] == "datadog" for e in events(c))

    # grants are removed when the app is disconnected
    c.put(f"/api/bots/{bots(c)['Builder']}/apps/datadog", json={"tools": ["query_metrics"]})
    assert apps(c)["datadog"]["grants"][bots(c)["Builder"]] == ["query_metrics"]
    r = c.post("/api/apps/datadog/disconnect")
    assert r.status_code == 200 and r.json()["connected"] is False and r.json()["mode"] == "demo"
    assert apps(c)["datadog"]["grants"] == {}
    assert any(e["event_type"] == "app.disconnected" for e in events(c))


def test_unknown_app_or_action_is_404(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    assert c.post("/api/apps/nope/connect").status_code == 404
    assert c.post("/api/apps/datadog/teleport").status_code == 404


# ---------- grants + audit ----------

def test_grant_save_is_audited(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    c.post("/api/apps/notion/connect")
    builder = bots(c)["Builder"]
    r = c.put(f"/api/bots/{builder}/apps/notion", json={"tools": ["search_pages", "create_page"]})
    assert r.status_code == 200
    assert r.json() == {"agent": builder, "app": "notion", "tools": ["search_pages", "create_page"]}
    assert set(apps(c)["notion"]["grants"][builder]) == {"search_pages", "create_page"}
    ev = [e for e in events(c) if e["event_type"] == "agent.grants.changed"]
    assert ev and ev[0]["payload"]["agent"] == builder and ev[0]["payload"]["app"] == "notion"
    assert ev[0]["payload"]["after"] == ["search_pages", "create_page"]


def test_grant_validation(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    builder = bots(c)["Builder"]
    c.post("/api/apps/notion/connect")
    assert c.put(f"/api/bots/{builder}/apps/notion", json={"tools": ["nope"]}).status_code == 422
    assert c.put(f"/api/bots/{builder}/apps/notion", json={"tools": ["search_pages", "create_page"]}).status_code == 200
    # not connected -> 409
    assert c.put(f"/api/bots/{builder}/apps/sentry", json={"tools": ["list_issues"]}).status_code == 409
    # unknown agent / app -> 404
    assert c.put("/api/bots/ghost/apps/notion", json={"tools": []}).status_code == 404
    assert c.put(f"/api/bots/{builder}/apps/ghost", json={"tools": []}).status_code == 404
    # secret tools can never be granted
    c.post("/api/apps/1password/connect")
    assert c.put(f"/api/bots/{builder}/apps/1password", json={"tools": ["read_secret"]}).status_code == 422


# ---------- tool call -> approval ----------

def test_read_call_runs_immediately_and_write_call_waits_for_approval(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    b = bots(c)
    c.post("/api/apps/notion/connect")
    c.put(f"/api/bots/{b['Builder']}/apps/notion", json={"tools": ["search_pages"]})
    read = c.post(f"/api/bots/{b['Builder']}/tools", json={"app": "notion", "tool": "search_pages", "args": {}})
    assert read.status_code == 200 and read.json()["status"] == "completed" and "No external service" in read.json()["result"]

    c.post("/api/apps/atlassian/connect")
    c.put(f"/api/bots/{b['Builder']}/apps/atlassian", json={"tools": ["create_issue"]})
    write = c.post(f"/api/bots/{b['Builder']}/tools", json={"app": "atlassian", "tool": "create_issue", "args": {}})
    assert write.status_code == 200 and write.json()["status"] == "pending_approval"
    assert write.json()["approval"]["status"] == "pending"
    calls = c.get("/api/tool-calls").json()
    assert any(x["tool"] == "create_issue" and x["approval_id"] == write.json()["approval"]["id"] for x in calls)
    types = [e["event_type"] for e in events(c)]
    assert "tool.call" in types and "tool.pending" in types


# ---------- live MCP servers (mocked transport, no network) ----------

def _add_live(c, monkeypatch, tools=None, url="https://mcp.example/mcp"):
    monkeypatch.setenv("CFA_MCP_ALLOW_PRIVATE", "1")
    calls = mock_mcp(monkeypatch, tools or LIVE_TOOLS)
    r = c.post("/api/mcp/servers", json={"name": "Fake metrics", "url": url})
    return r, calls


def test_add_live_server_discovers_tools_and_lists_it(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    r, calls = _add_live(c, monkeypatch)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["live"] is True and body["name"] == "Fake metrics"
    assert body["id"] == "mcp-fake-metrics"
    assert {"name": "list_items", "risk": "read", "description": "List items"} in body["tools"]
    assert {"name": "update_item", "risk": "write", "description": "Update an item"} in body["tools"]
    assert {"name": "read_secret", "risk": "secret", "description": "Read a secret"} in body["tools"]
    assert "initialize" in calls and "tools/list" in calls

    listed = apps(c)
    srv = listed[body["id"]]
    assert srv["live"] is True and srv["connected"] is True and srv["category"] == "Live MCP server"
    assert srv["grants"] == {}
    assert any(e["event_type"] == "mcp.server.added" and e["payload"]["id"] == body["id"] for e in events(c))


def test_live_server_grants_refresh_and_remove(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    r, _ = _add_live(c, monkeypatch)
    sid, builder = r.json()["id"], bots(c)["Builder"]
    # live servers are connected by definition: grants save without an org_apps row
    assert c.put(f"/api/bots/{builder}/apps/{sid}", json={"tools": ["list_items"]}).status_code == 200
    assert c.put(f"/api/bots/{builder}/apps/{sid}", json={"tools": ["read_secret"]}).status_code == 422

    # refresh: tools change and grants for vanished tools are pruned
    mock_mcp(monkeypatch, [{"name": "list_items", "annotations": {"readOnlyHint": True}}])
    res = c.post(f"/api/mcp/servers/{sid}/refresh")
    assert res.status_code == 200 and [t["name"] for t in res.json()["tools"]] == ["list_items"]
    assert any(e["event_type"] == "mcp.server.refreshed" for e in events(c))
    res = c.post(f"/api/mcp/servers/{sid}/refresh")
    assert res.status_code == 200
    mock_mcp(monkeypatch, [{"name": "other_tool"}])
    c.post(f"/api/mcp/servers/{sid}/refresh")
    assert apps(c)[sid]["grants"].get(builder, []) == []  # list_items no longer exists -> grant pruned

    # refresh is only for live servers
    c.post("/api/apps/notion/connect")
    assert c.post("/api/mcp/servers/notion/refresh").status_code == 404
    removed = c.delete(f"/api/mcp/servers/{sid}")
    assert removed.status_code == 200 and removed.json() == {"status": "removed"}
    assert sid not in apps(c)
    assert any(e["event_type"] == "mcp.server.removed" and e["payload"]["id"] == sid for e in events(c))


def test_add_server_validation_without_network(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    # pydantic validation
    assert c.post("/api/mcp/servers", json={"name": "x", "url": "https://mcp.example/mcp"}).status_code == 422
    # bad scheme / insecure http are rejected before any request is made
    assert c.post("/api/mcp/servers", json={"name": "Fake", "url": "ftp://x"}).status_code == 422
    assert c.post("/api/mcp/servers", json={"name": "Fake", "url": "http://mcp.example/mcp"}).status_code == 422
    # private/loopback targets are rejected by the SSRF guard (resolved locally, no outbound network)
    monkeypatch.delenv("CFA_MCP_ALLOW_PRIVATE", raising=False)
    assert c.post("/api/mcp/servers", json={"name": "Fake", "url": "https://127.0.0.1/mcp"}).status_code == 422
    # tokens need CFA_SECRET_KEY
    mock_mcp(monkeypatch, LIVE_TOOLS)
    r = c.post("/api/mcp/servers", json={"name": "Fake", "url": "https://mcp.example/mcp", "token": "s3cret-token"})
    assert r.status_code == 400 and "CFA_SECRET_KEY" in r.json()["detail"]


def test_unreachable_server_is_502(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    monkeypatch.setenv("CFA_MCP_ALLOW_PRIVATE", "1")

    def handler(request):
        raise httpx.ConnectError("no route", request=request)

    monkeypatch.setattr(mcp_apps, "TRANSPORT", httpx.MockTransport(handler))
    r = c.post("/api/mcp/servers", json={"name": "Down", "url": "https://down.example/mcp"})
    assert r.status_code == 502 and r.json()["detail"] == "Could not reach the MCP server"


# ---------- admin gate ----------

def test_connector_writes_require_admin(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, "adm:admin:Alice,mem:member:Bob")
    adm, mem = {"Authorization": "Bearer adm"}, {"Authorization": "Bearer mem"}
    assert c.get("/api/apps", headers=mem).status_code == 200
    assert c.post("/api/apps/datadog/connect", headers=mem).status_code == 403
    assert c.post("/api/apps/datadog/connect", headers=adm).status_code == 200
    assert c.put(f"/api/bots/builder/apps/datadog", json={"tools": ["query_metrics"]}, headers=mem).status_code == 403
    assert c.put(f"/api/bots/builder/apps/datadog", json={"tools": ["query_metrics"]}, headers=adm).status_code == 200
    assert c.post("/api/mcp/servers", json={"name": "Fake", "url": "https://mcp.example/mcp"}, headers=mem).status_code == 403
    assert c.post("/api/apps/datadog/disconnect", headers=mem).status_code == 403


# ---------- static markup of the new overlay ----------

def test_served_app_js_has_connector_v2_markers(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    for marker in (
        "S.appTab", "'Catalog'", "'My connectors'", "'Add MCP server'",
        "'Search connectors'", "'Agent tool grants'", "'Try a call'", "'All read'",
        "'Manage grants'", "'Streamable HTTP'", "'No connectors yet'",
        "mcp-switch", "mcp-matrix", "mcp-search", "S.mcpNote", "S.mcpBusy",
        "/api/mcp/servers/${a.id}/refresh", "`/api/bots/${b.id}/apps/${a.id}`",
        "/api/apps/${a.id}/connect", "/api/apps/${a.id}/disconnect",
        "Secret-looking tools can never be granted",
    ):
        assert marker in js, f"missing marker: {marker}"
    # the old one-scroll modal is gone
    for gone in ("Apps (MCP)", "Connect (demo)", "'Search apps'", "Run as this agent", "'aria-label': 'Apps'"):
        assert gone not in js, f"old markup still present: {gone}"
    # no German copy anywhere in the connector area (and none introduced globally)
    assert "Apps verbinden" not in js and "verbunden" not in js


def test_served_css_has_batch9_block(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    css = c.get("/static/style.css").text
    for marker in ("/* ===== Batch 9 — Connector ===== */", ".mcp-modal", ".mcp-tabs", ".mcp-grid",
                   ".mcp-matrix", ".mcp-switch", ".mcp-track", ".mcp-knob", ".mcp-facts", ".mcp-empty"):
        assert marker in css, f"missing CSS marker: {marker}"
    assert "@media (max-width: 760px)" in css
    assert "@media (prefers-color-scheme: dark)" in css
