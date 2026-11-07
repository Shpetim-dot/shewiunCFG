"""Wave-2 batch 8 — agent settings v2.

HTTP contract tests for the endpoints the redesigned right-hand agent panel and the full agent
settings overlay drive, plus static-content checks on the served SPA files (this frontend has no
bundler, so the served app.js / style.css are the only source of truth for UI behaviour).
"""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"
CAPABILITIES = ["memory.read", "memory.write", "call.join", "approval.request", "payments.propose"]
CSS_MARKER = "/* ===== Batch 8 — Agent settings ===== */"


def fresh(tmp_path, monkeypatch, name="wave2-b8.db"):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / name)
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "HF_TOKEN", "CFA_HF_TOKEN", "CFA_MODEL_NAME"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "o@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def bot(c, bid):
    return next(b for b in c.get("/api/bots").json() if b["id"] == bid)


def events(c, limit=100):
    return c.get(f"/api/security/audit?limit={limit}").json()["events"]


def js_regions(c):
    js = c.get("/static/app.js").text
    pstart = js.index("  function passport() {")
    pend = js.index("  // ---------- council (live) ----------", pstart)
    sstart = js.index("  // ---------- agent settings v2 (wave 2, batch 8) ----------")
    send = js.index("  // Reader view: shows the source the agent is reading right now.", sstart)
    return js, js[pstart:pend], js[sstart:send]


# ---------- HTTP contracts: model state ----------
def test_model_string_reports_the_honest_no_model_state(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    bots = c.get("/api/bots").json()
    assert bots
    bid = bots[0]["id"]
    # No provider key on this deployment: every agent reports demo mode, which the UI maps to
    # "Model must be configured".
    assert all(b["model"] == "demo mode" for b in bots)

    r = c.put(f"/api/bots/{bid}/model", json={"model": "hf:MiniMaxAI/MiniMax-M2"}, headers=csrf(c))
    assert r.status_code == 200, r.text
    assert r.json() == {"id": bid, "model": "hf:MiniMaxAI/MiniMax-M2", "live": False}
    # Without the key the list endpoint appends "(no key)"; the panel treats that as unconfigured.
    assert bot(c, bid)["model"] == "hf:MiniMaxAI/MiniMax-M2 (no key)"

    assert c.put(f"/api/bots/{bid}/model", json={"model": ""}, headers=csrf(c)).status_code == 200
    assert bot(c, bid)["model"] == "demo mode"

    assert c.put(f"/api/bots/{bid}/model", json={"model": "not a model!"}, headers=csrf(c)).status_code == 422
    assert c.put("/api/bots/nope/model", json={"model": "x"}, headers=csrf(c)).status_code == 404
    assert TestClient(main.app).put(f"/api/bots/{bid}/model", json={"model": "x"}).status_code == 401


# ---------- HTTP contracts: permissions ----------
def test_scopes_put_roundtrip_validation_and_audit(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    templates = c.get("/api/templates").json()
    assert next((x["capabilities"] for x in templates if "capabilities" in x), None) == CAPABILITIES
    bid = c.get("/api/bots").json()[0]["id"]
    before = bot(c, bid)["scopes"]

    new = ["memory.read", "call.join"]
    r = c.put(f"/api/bots/{bid}/scopes", json={"scopes": new}, headers=csrf(c))
    assert r.status_code == 200, r.text
    assert r.json() == {"id": bid, "scopes": new}
    assert bot(c, bid)["scopes"] == new

    changed = [e for e in events(c) if e["event_type"] == "agent.scopes.changed"]
    assert changed, "scope changes must be audited"
    payload = changed[0]["payload"]
    assert payload["agent"] == bid and payload["before"] == before and payload["after"] == new

    # The UI can clear every permission; unknown capabilities and >5 entries are rejected.
    assert c.put(f"/api/bots/{bid}/scopes", json={"scopes": []}, headers=csrf(c)).status_code == 200
    assert bot(c, bid)["scopes"] == []
    assert c.put(f"/api/bots/{bid}/scopes", json={"scopes": ["payments.execute"]}, headers=csrf(c)).status_code == 422
    assert c.put(f"/api/bots/{bid}/scopes", json={"scopes": CAPABILITIES + ["memory.read"]}, headers=csrf(c)).status_code == 422
    assert c.put("/api/bots/nope/scopes", json={"scopes": []}, headers=csrf(c)).status_code == 404
    assert TestClient(main.app).put(f"/api/bots/{bid}/scopes", json={"scopes": new}).status_code == 401


# ---------- HTTP contracts: general / accountability / danger ----------
def test_general_accountability_and_danger_actions_roundtrip(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    bid = c.get("/api/bots").json()[0]["id"]

    r = c.patch(f"/api/bots/{bid}/accountability",
                json={"owner": "Ada", "sponsor": "Grace", "purpose": "Reviews invoices and proposes payments."},
                headers=csrf(c))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["owner"] == "Ada" and body["sponsor"] == "Grace" and body["gaps"] == []
    inv = {row["id"]: row for row in c.get("/api/inventory").json()}[bid]
    assert inv["owner"] == "Ada" and inv["sponsor"] == "Grace" and inv["accountability"] == []

    assert c.put(f"/api/bots/{bid}/meta", json={"criticality": "high"}, headers=csrf(c)).json()["criticality"] == "high"
    assert c.post(f"/api/bots/{bid}/status", json={"status": "suspended", "reason": "qa"}, headers=csrf(c)).status_code == 200
    assert bot(c, bid)["status"] == "suspended"
    assert c.post(f"/api/bots/{bid}/status", json={"status": "active", "reason": "qa"}, headers=csrf(c)).status_code == 200
    assert c.post(f"/api/bots/{bid}/trust", json={"trust": "unverified"}, headers=csrf(c)).json()["trust"] == "unverified"
    assert bot(c, bid)["trust"] == "unverified"
    assert c.post(f"/api/bots/{bid}/trust", json={"trust": "verified"}, headers=csrf(c)).status_code == 200

    # enums stay strict so the UI never sends values outside the documented sets
    assert c.put(f"/api/bots/{bid}/meta", json={"criticality": "critical"}, headers=csrf(c)).status_code == 422
    assert c.post(f"/api/bots/{bid}/status", json={"status": "paused"}, headers=csrf(c)).status_code == 422
    assert c.post(f"/api/bots/{bid}/trust", json={"trust": "maybe"}, headers=csrf(c)).status_code == 422
    assert c.patch(f"/api/bots/{bid}/accountability", json={"purpose": "x" * 301}, headers=csrf(c)).status_code == 422

    kinds = {e["event_type"] for e in events(c)}
    assert {"agent.accountability", "agent.meta.changed", "agent.suspended", "agent.resumed", "agent.trust.changed"} <= kinds

    # rename (General) and delete (Danger) are the panel's own buttons
    r = c.patch(f"/api/bots/{bid}", json={"name": "Ledger Owner"}, headers=csrf(c))
    assert r.status_code == 200 and bot(c, bid)["name"] == "Ledger Owner"
    r = c.delete(f"/api/bots/{bid}", headers=csrf(c))
    assert r.status_code == 200 and r.json()["deleted"] is True
    assert bid not in {b["id"] for b in c.get("/api/bots").json()}
    assert any(e["event_type"] == "agent.deleted" for e in events(c))


# ---------- HTTP contracts: per-agent activity ----------
def test_per_agent_audit_chain_feeds_the_activity_tab(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/bots", json={"template": "finance-analyst", "name": "Ledger"}, headers=csrf(c))
    assert r.status_code == 201, r.text
    bid = r.json()["id"]

    # A fresh agent has an honest empty chain (the UI shows the empty state, not fake events).
    empty = c.get(f"/api/bots/{bid}/audit").json()
    assert empty["total"] == 0 and empty["entries"] == [] and empty["integrity"]["valid"] is True

    assert c.post(f"/api/bots/{bid}/messages", json={"content": "Which payment limits apply?"}, headers=csrf(c)).status_code == 200
    audit = c.get(f"/api/bots/{bid}/audit?limit=10").json()
    assert audit["total"] >= 2
    assert {"message", "reply"} <= {e["kind"] for e in audit["entries"]}
    assert audit["integrity"]["valid"] is True
    assert c.get(f"/api/bots/{bid}/audit/verify").json()["valid"] is True
    entry = audit["entries"][0]
    assert set(entry) == {"id", "ts", "kind", "actor", "summary", "payload", "prev_hash", "hash"}
    assert c.get("/api/bots/nope/audit").status_code == 404


# ---------- static content: the served SPA is the frontend contract ----------
def test_panel_and_overlay_static_contract(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js, panel, settings = js_regions(c)

    # The panel header and the segmented tab control (the tab bodies live in the settings region).
    for marker in ("agx-panel", "agx-head", "agx-ident", "agx-name", "agx-chips", "agx-modelchip", "agx-gearbtn",
                   "'Agent settings'", "agx-tabs", "agx-tab", "agx-body", "'Overview'", "'Activity'", "'Memory'",
                   "'Apps'", "openAgentSettings('general')"):
        assert marker in panel, marker
    # Tab bodies: facts grid, permissions, model state, controls, live view, memory and apps summary.
    both = panel + settings
    for marker in ("agxOverviewTab", "agxActivityTab", "agxMemoryTab", "agxAppsTab", "agx-facts", "agx-fact",
                   "agx-switchlist", "agx-switchrow", "'Save permissions'", "'Suspend agent'", "'Resume agent'",
                   "'Mark as reviewed'", "'Open full settings'", "'Export card'", "agxLiveWindow", "screenbody",
                   "/scopes", "/status", "/trust", "/card"):
        assert marker in both, marker
    # The old flat tab list and the old key/value markup are gone from the panel.
    for old in ("const tabs = ['overview', 'screen', 'memory', 'apps']", "class: 'tabs'", "kv('Role'", "kv('Team'"):
        assert old not in panel, old

    # The overlay: state, section nav, real endpoints and honest empty states.
    for marker in ("agentSettingsModal", "AGX_SECTIONS", "'General'", "'Permissions'", "'Accountability'",
                   "'Activity'", "'Apps & tools'", "'Danger'", "agx-nav", "agx-navbtn", "agx-modal", "agx-sec",
                   "agx-card", "agx-danger", "S.agx", "S.agxInv", "S.agxPanelAudit", "agxAct", "syncOverlays(true)",
                   "/api/inventory", "/accountability", "/audit", "/audit/verify", "/audit/export", "openApps",
                   "'Open connector'", "'Delete agent'", "'Verify chain'", "'Export NDJSON'", "agxHasModel",
                   "AGX_MODEL_MISSING = 'Model must be configured'", "endsWith('(no key)')", "'demo mode'",
                   "agxModelLabel", "agxGeneralSection", "agxPermissionsSection", "agxAccountabilitySection",
                   "agxActivitySection", "agxAppsSection", "agxDangerSection"):
        assert marker in settings, marker
    assert "agx-" in settings and settings.count("agx-") > 40

    # syncOverlays: one small branch plus the state segment in its signature.
    assert "const agxSig = S.modal === 'agentSettings' && S.agx" in js
    assert "+ upSig + agxSig" in js
    assert "else if (m === 'agentSettings') parts.push(agentSettingsModal());" in js

    # Lazy state only: no new field in the shared const S literal.
    literal = js[js.index("const S = {"):js.index("let token = sessionStorage")]
    assert "agx" not in literal

    # English copy only in the new regions.
    for word in ("Berechtigungen", "Einstellungen", "Speichern", "Allgemein", "Abbrechen", "Löschen"):
        assert word not in panel and word not in settings, word


def test_settings_overlay_css_block_is_marked_responsive_and_dark_mode_safe(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.get("/static/style.css")
    assert r.status_code == 200
    css = r.text
    assert CSS_MARKER in css
    idx = css.index(CSS_MARKER)
    assert ".agx-" not in css[:idx], "batch 8 classes must only live in the marked block"
    block = css[idx:]
    assert block.strip().startswith(CSS_MARKER)
    for selector in (".agx-panel", ".agx-head", ".agx-tabs", ".agx-tab", ".agx-facts", ".agx-fact",
                     ".agx-card", ".agx-switchrow", ".agx-switch", ".agx-model-warn", ".agx-gearbtn",
                     ".agx-modal", ".agx-nav", ".agx-navbtn", ".agx-sec", ".agx-danger", ".agx-ev"):
        assert selector in block, selector
    assert "@media (max-width: 760px)" in block
    assert "@media (max-width: 1180px)" in block
    assert "prefers-color-scheme: dark" in block
    assert "prefers-reduced-motion: reduce" in block
    # panel and overlay both exist on the same page: the overlay must sit above the drawer scrim
    assert ".agx-scrim" in block
