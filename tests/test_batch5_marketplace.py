"""Batch 5 — Marketplace: curated cards, real tags/role, trust status and search.

Backend contract: the curated payload carries the template role and a stable colour (additive keys,
the system prompt stays private) and the import rule is unchanged (curated -> verified).
Frontend contract: the served SPA renders cards with a preview, derived tags, a factual trust chip
and search/filter controls instead of the old flat list.
"""
import re

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import governance
from app import main

STRONG = "correct-horse-battery-staple-42"


def client(tmp_path, monkeypatch, **env):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "market.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_DEV_TOKENS", "CFA_MODEL_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def sign_in(c):
    r = c.post("/api/auth/register", json={"email": "owner@example.com", "password": STRONG, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201
    assert c.cookies.get("cfa_csrf")
    return {"X-CSRF-Token": c.cookies["cfa_csrf"]}


def marketplace_js(c):
    """The served app.js, sliced to the marketplace view, so old markers elsewhere cannot hide."""
    js = c.get("/static/app.js").text
    start = js.index("function marketView()")
    end = js.index("// ---------- control ----------", start)
    return js, js[start:end]


# ---------- backend contract ----------
def test_catalog_returns_six_curated_items_with_real_role_and_color(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    sign_in(c)
    curated = c.get("/api/marketplace").json()["curated"]
    assert len(curated) == 6
    assert [i["id"] for i in curated] == [m["id"] for m in governance.MARKET]
    for item, source in zip(curated, governance.MARKET):
        for key in ("id", "name", "category", "template", "description", "risk"):
            assert item[key] == source[key], (item["id"], key)
        template = governance.TEMPLATES[source["template"]]
        assert isinstance(item["scopes"], list) and item["scopes"], item["id"]
        assert item["scopes"] == template["scopes"]
        assert item["role"] == template["role"] and item["role"]
        assert item["icon"] == (source.get("icon") or template["icon"])
        assert item["color"] == (source.get("color") or template["color"])
        assert re.fullmatch(r"#[0-9A-Fa-f]{6}", item["color"])
        assert "system" not in item  # prompts stay server-side


def test_curated_import_needs_auth_and_csrf_and_creates_a_verified_agent(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    csrf = sign_in(c)
    card = {i["id"]: i for i in c.get("/api/marketplace").json()["curated"]}["ledger-analyst"]
    body = {"source": "curated", "ref": "ledger-analyst", "name": "Ledger One"}
    assert c.post("/api/marketplace/import", json=body).status_code == 403
    assert c.post("/api/marketplace/import", json=body, headers={"X-CSRF-Token": "forged"}).status_code == 403
    assert TestClient(main.app).post("/api/marketplace/import", json=body).status_code == 401
    r = c.post("/api/marketplace/import", json=body, headers=csrf)
    assert r.status_code == 201
    created = r.json()
    assert created["trust"] == "verified" and created["scopes"] == card["scopes"]
    bot = {b["id"]: b for b in c.get("/api/bots").json()}[created["id"]]
    assert bot["trust"] == "verified" and bot["source"] == "marketplace"
    assert bot["role"] == card["role"] and bot["color"] == card["color"] and bot["scopes"] == card["scopes"]
    inv = {a["id"]: a for a in c.get("/api/inventory").json()}[created["id"]]
    assert inv["trust"] == "verified" and inv["role"] == card["role"] and inv["source_ref"] == "ledger-analyst"
    events = c.get("/api/security/audit?limit=200").json()["events"]
    imported = [e for e in events if e["event_type"] == "agent.imported"]
    assert any(e["payload"] == {"agent": created["id"], "source": "curated", "ref": "ledger-analyst"} for e in imported)


def test_invalid_huggingface_ref_is_422_and_unknown_curated_ref_is_404(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    csrf = sign_in(c)
    for ref in ("not-a-model", "bad id", "owner/", ""):
        r = c.post("/api/marketplace/import", json={"source": "huggingface", "ref": ref, "name": "Nope"}, headers=csrf)
        assert r.status_code == 422, (ref, r.status_code)
    assert c.post("/api/marketplace/import", json={"source": "curated", "ref": "no-such-entry", "name": "Nope"}, headers=csrf).status_code == 404


# ---------- static UI contract ----------
def test_marketplace_view_renders_cards_search_filters_and_trust(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, view = marketplace_js(c)
    for marker in ("mkt-grid", "mkt-card", "mkt-head", "mkt-desc", "mkt-tags", "mkt-prev", "mkt-trust", "mkt-foot",
                   "Search curated agents", "mkt-filter-row", "mkt-search", "mkt-count",
                   "Verified source", "Unverified external", "Curated agents are imported as verified and inherit the template's scopes.",
                   "of ${S.market.length} entries", "S.mktQ", "S.mktCat", "S.mktRisk", "c.role", "c.color"):
        assert marker in view, marker
    # Tag values come only from real payload fields (template id, scopes) - no invented marketing tags.
    assert "template: ' + c.template" in view
    # No old list-only rendering of the curated catalog.
    for stale in ("card appcard", "class: 'cards'", "tile(c, 38)", "h('div', { class: 'cards' }"):
        assert stale not in view, stale
    # Import flows are unchanged: same endpoint, bot reload, info banner, no navigation.
    start = js.index("const importAgent")
    import_fn = js[start:js.index("function marketView()", start)]
    assert "/api/marketplace/import" in import_fn and "await loadBots()" in import_fn and "S.info =" in import_fn


def test_style_css_appends_the_marketplace_block(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    css = c.get("/static/style.css").text
    assert css.count("/* ===== Batch 5 — Marketplace ===== */") == 1
    assert ".mkt-grid" in css and ".mkt-card" in css and ".mkt-trust" in css and ".mkt-foot" in css
    block = css[css.index("/* ===== Batch 5 — Marketplace ===== */"):]
    assert "@media (max-width: 760px)" in block and ".mkt-grid { grid-template-columns: 1fr; }" in block
    assert css.rstrip().endswith("}")  # the block is appended at the very end
