"""Wave-2 batch 11 — Marketplace v2: hero/featured/category structure on real catalog data.

Backend contract (re-checked, unchanged): 6 curated entries with the real template role/color and the
factual import rules (curated -> verified with template scopes, Hugging Face/card -> unverified with
read-only scopes). Frontend contract: the served SPA renders the Shewiun marketplace structure -
hero with the trust explanation, a sticky search/filter toolbar, featured cards that use tile(), and
category sections in catalog order. No invented data (no ratings, installs or authors).
"""
import re

import httpx
from fastapi import FastAPI, Response
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import governance
from app import main

STRONG = "correct-horse-battery-staple-42"
READ_ONLY = ["memory.read", "call.join"]


def client(tmp_path, monkeypatch, **env):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "market2.db")
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


def assets(c):
    js = c.get("/static/app.js").text
    start = js.index("function marketView()")
    end = js.index("// ---------- control ----------", start)
    return js, js[start:end], c.get("/static/style.css").text


# ---------- backend contract ----------
def test_catalog_returns_six_curated_entries_with_real_role_and_color(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    sign_in(c)
    curated = c.get("/api/marketplace").json()["curated"]
    assert len(curated) == 6
    assert [i["id"] for i in curated] == [m["id"] for m in governance.MARKET]
    categories = []
    for item, source in zip(curated, governance.MARKET):
        template = governance.TEMPLATES[source["template"]]
        for key in ("id", "name", "category", "template", "description", "risk"):
            assert item[key] == source[key], (item["id"], key)
        assert isinstance(item["scopes"], list) and item["scopes"]
        assert item["scopes"] == template["scopes"]
        assert item["role"] == template["role"] and item["role"]
        assert item["icon"] == (source.get("icon") or template["icon"])
        assert item["color"] == (source.get("color") or template["color"])
        assert re.fullmatch(r"#[0-9A-Fa-f]{6}", item["color"])
        assert "system" not in item
        if item["category"] not in categories:
            categories.append(item["category"])
    # The UI groups by exactly these categories, in catalog order.
    assert categories == ["Finance", "Research", "Support", "Security", "Operations"]


def test_curated_import_is_verified_audited_and_needs_auth_plus_csrf(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    csrf = sign_in(c)
    card = {i["id"]: i for i in c.get("/api/marketplace").json()["curated"]}["ledger-analyst"]
    body = {"source": "curated", "ref": "ledger-analyst", "name": "Ledger Two"}
    assert c.post("/api/marketplace/import", json=body).status_code == 403
    assert c.post("/api/marketplace/import", json=body, headers={"X-CSRF-Token": "forged"}).status_code == 403
    assert TestClient(main.app).post("/api/marketplace/import", json=body).status_code == 401
    r = c.post("/api/marketplace/import", json=body, headers=csrf)
    assert r.status_code == 201
    created = r.json()
    assert created["trust"] == "verified" and created["scopes"] == card["scopes"]
    inv = {a["id"]: a for a in c.get("/api/inventory").json()}[created["id"]]
    assert inv["trust"] == "verified" and inv["source"] == "marketplace" and inv["source_ref"] == "ledger-analyst"
    assert inv["role"] == card["role"]
    events = c.get("/api/security/audit?limit=200").json()["events"]
    assert any(e["event_type"] == "agent.imported" and e["payload"]["agent"] == created["id"] for e in events)


def test_import_error_paths_and_external_sources_stay_honest(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    csrf = sign_in(c)
    for ref in ("not-a-model", "bad id", "owner/", ""):
        assert c.post("/api/marketplace/import", json={"source": "huggingface", "ref": ref, "name": "Nope"}, headers=csrf).status_code == 422
    assert c.post("/api/marketplace/import", json={"source": "curated", "ref": "no-such-entry", "name": "Nope"}, headers=csrf).status_code == 404
    assert c.post("/api/marketplace/import", json={"source": "card", "name": "Bad", "card": {"system": "x"}}, headers=csrf).status_code == 422
    # Hugging Face search and import run against a stub transport (no live network in tests).
    hf = FastAPI()

    @hf.get("/api/models")
    async def models(search: str = ""):
        return [{"id": "acme/tiny-llm", "downloads": 1200, "likes": 5, "pipeline_tag": "text-generation", "tags": ["a"]},
                {"id": "bad id", "downloads": 1}]

    @hf.get("/api/models/{owner}/{name}")
    async def model(owner: str, name: str):
        return {"id": f"{owner}/{name}"} if f"{owner}/{name}" == "acme/tiny-llm" else Response(status_code=404)

    monkeypatch.setattr(governance, "HF_TRANSPORT", httpx.ASGITransport(app=hf))
    cards = c.get("/api/marketplace/huggingface?q=tiny").json()
    assert [x["id"] for x in cards] == ["acme/tiny-llm"]
    got = c.post("/api/marketplace/import", json={"source": "huggingface", "ref": "acme/tiny-llm", "name": "Tiny"}, headers=csrf).json()
    assert got["trust"] == "unverified" and got["scopes"] == READ_ONLY
    inv = {a["id"]: a for a in c.get("/api/inventory").json()}[got["id"]]
    assert inv["trust"] == "unverified" and inv["source"] == "huggingface" and inv["source_ref"] == "acme/tiny-llm"
    assert c.post("/api/marketplace/import", json={"source": "huggingface", "ref": "acme/missing", "name": "Nope"}, headers=csrf).status_code == 422


# ---------- static UI contract ----------
def test_marketplace_view_has_hero_featured_and_category_structure(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, view, css = assets(c)
    for marker in ("mkt2-hero", "mkt2-title", "mkt2-trustkey", "mkt2-tabs", "mkt2-sticky",
                   "mkt2-search", "mkt2-chip", "mkt2-featsec", "mkt2-featrow", "mkt2-featcard",
                   "mkt2-sec", "mkt2-sec-head", "mkt2-list", "mkt2-row", "mkt2-rowadd",
                   "mkt2-prev", "mkt2-trust", "mkt2-nameinput", "mkt2-hfgrid", "mkt2-hfcard",
                   "mkt2-importcard", "mkt2-notecard", "mkt2-footnote"):
        assert marker in view, marker
    # Hero, featured row, category grouping and sticky controls are real behaviour, not just class names.
    for marker in ("Featured", "Category", "Risk", "Search curated agents",
                   "Verified source", "Unverified external",
                   "Curated agents are imported as verified and inherit the template's scopes.",
                   "of ${S.market.length} entries",
                   "new Set(S.market.map((c) => c.category))", "S.market.slice(0, 3)",
                   "S.mkt2Q", "S.mkt2Cat", "S.mkt2Risk", "c.role", "c.color",
                   "Curated", "Hugging Face", "Import a card"):
        assert marker in view, marker
    # Cards render the shared asset() avatar helper (wave-2 batch 7 upgrades it globally).
    assert "tile(c, 56)" in view and "tile(c, 40)" in view
    # Only real payload data: no invented ratings, install counts or author names.
    lowered = view.lower()
    for invented in ("rating", "ratings", "installs", "stars", "author"):
        assert invented not in lowered, invented
    # The old wave-1 marketplace markup is gone.
    for stale in ("mkt-grid", "mkt-card", "card appcard", "class: 'cards'", "tile(c, 38)"):
        assert stale not in view, stale
    assert not any(old in view for old in ("mkt-",))
    # English only in this screen (no German leftovers such as Kategorie/Suche/Risiko).
    assert not re.search(r"[äöüßÄÖÜ]", view)
    # The import flow is unchanged: same endpoint, bot reload, info banner, no navigation.
    start = js.index("const importAgent")
    import_fn = js[start:js.index("function marketView()", start)]
    assert "/api/marketplace/import" in import_fn and "await loadBots()" in import_fn and "S.info =" in import_fn


def test_styles_css_appends_the_marketplace_v2_block(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    css = c.get("/static/style.css").text
    marker = "/* ===== Batch 11 — Marketplace v2 ===== */"
    assert css.count(marker) == 1
    block = css[css.index(marker):]
    for cls in (".mkt2-hero", ".mkt2-sticky", ".mkt2-featpanel", ".mkt2-featrow", ".mkt2-list",
                ".mkt2-row", ".mkt2-hfgrid", ".mkt2-importcard"):
        assert cls in block, cls
    assert "@media (max-width: 760px)" in block
    assert "@media (prefers-color-scheme: dark)" in block
    # The wave-1 marketplace block is preserved (rules are never edited, only appended to).
    assert css.count("/* ===== Batch 5 — Marketplace ===== */") == 1
    assert css.index(marker) > css.index("/* ===== Batch 5 — Marketplace ===== */")
    assert css.rstrip().endswith("}")
