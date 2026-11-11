"""Wave-2 batch 7 — 3-D avatars, cursor gaze, walk-to-message and the refined left sidebar.

This batch is pure frontend: no endpoint changed. The tests pin the contract of the served SPA
(`/static/app.js` + `/static/style.css`) so later wave-2 merges cannot silently drop the 3-D plate,
the single global gaze tracker, the walk animation or the sidebar hierarchy. `tile(b, s = 40, o = {})`
stays the one avatar entry point and every identity attribute (ring colours, arcs, eyes, brows,
mouth) must survive the upgrade.
"""
import re

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

CSS_MARKER = "/* ===== Batch 7 — 3-D avatars & sidebar ===== */"


def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "w2-avatars.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def served(c):
    js, css = c.get("/static/app.js"), c.get("/static/style.css")
    assert js.status_code == 200 and css.status_code == 200
    return js.text, css.text


def avatar_js(js):
    """The avatar block, sliced so old markup elsewhere cannot hide a regression."""
    start = js.index("const R = (x, y")
    end = js.index("const when = ", start)
    return js[start:end]


def send_js(js):
    body = re.search(r"async function send\(\)\s*\{(.*?)\n  \}", js, re.S)
    assert body, "send() not found"
    return body.group(1)


# ---------- the 3-D avatar plate ----------
def test_voxel_avatar_tile_preserves_agent_identity_and_crisp_svg(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, _ = served(c)
    block = avatar_js(js)
    for marker in ("const FACE_EYES = {", "const FACE_BROWS = {", "const FACE_MOUTHS = {",
                   "const CORE_FACE = {", "const CORE_SEED = {", "function lookOf(b) {",
                   "function tile(b, s = 40, o = {}) {", "av-ground", "av-side", "av-top",
                   "av-front", "av-eyes", "av-mouth", "av-tag"):
        assert marker in block, marker
    assert "setAttribute('viewBox', '0 0 48 48')" in block
    assert "setAttribute('shape-rendering', 'crispEdges')" in block
    assert "return h('span', { class: 'avatar'" in block
    assert "FIGURES.includes(b.figure)" in block
    for identity in ("strategist", "skeptic", "builder", "chair"):
        assert identity in block


def test_avatar_styles_use_light_and_dark_gradient_stops_and_a_drop_shadow(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    _, css = served(c)
    idx = css.index(CSS_MARKER)
    block = css[idx:]
    for marker in (".av3-plate-hi", ".av3-shade-hi", ".av3-rim-hi", ".av3-drop-in", ".av3-base",
                   ".av3-gloss", ".av3-spec", ".av3-arc-sh", ".av3-arc-hi", ".av3-body", ".av3-tint"):
        assert marker in block, marker
    assert "stop-color" in block
    assert "drop-shadow(" in block
    assert "prefers-color-scheme: dark" in block
    # Existing avatar keyframes are not replaced by the new block.
    assert "@keyframes blink" in css and "@keyframes look" in css and "@keyframes talk" in css
    assert ".av .blink" in css and ".av.thinking .look" in css


# ---------- cursor gaze ----------
def test_voxel_avatar_tile_uses_shared_palette_without_per_tile_listeners(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, _ = served(c)
    block = avatar_js(js)
    assert "function lookOf(b)" in block
    assert "function tile(b, s = 40, o = {}) {" in block
    assert "document.createElementNS(NS, 'svg')" in block
    assert "shape-rendering', 'crispEdges'" in block
    assert "addEventListener" not in block
    assert "document.addEventListener('pointermove'" not in js

# ---------- walk-to-message ----------
def test_chat_send_preserves_voxel_avatar_message_flow(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, _ = served(c)
    body = send_js(js)
    assert "const text = S.draft.trim()" in body
    assert "S.msgs.push({ role: 'user', content: text })" in body
    assert "/api/bots/" in body and "S.bot.id" in body
    assert "S.msgs.push({ role: 'agent'" in body
    assert "finally { S.busy = false; }" in body
    assert "av3WalkToMessage" not in js


# ---------- left sidebar refinement ----------
def test_sidebar_keeps_every_label_and_gains_sticky_groups_pins_and_footer_chips(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, _ = served(c)
    # Group headings stay data-driven from b.team and now carry a sticky class + real member count.
    assert "groups = [...new Set(S.bots.map((b) => b.team))]" in js
    assert "const list = S.bots.filter((b) => b.team === g)" in js
    for marker in ("'group av3-group'", "'av3-glabel'", "'av3-gcount'", "'agents av3-agents'",
                   "'agent av3-agent'", "'av3-agentav'", "'av3-agenttxt'", "'av3-pin'", "'av3-unread'"):
        assert marker in js, marker
    # Pin and unread are real indicators, no longer a "• " string prefix.
    assert "(S.pinned[b.id] ? '• ' : '')" not in js
    assert "av3Pin(12)" in js
    # Connect-apps button: flat neutral surface card with a neutral count chip (wave-3 batch 15
    # replaced the batch-7 gradient surface + green status dot; label and count text are kept).
    assert "'appsbtn mcp3-connect'" in js
    assert "mcp3-connect-count" in js
    assert "av3-dot" not in js
    assert "connected · MCP" in js and "'Connect apps'" in js
    # Account footer: avatar, name, email/role, model state, version chip and a menu chevron.
    for marker in ("'acct av3-acct'", "'av3-acctav'", "av3-usertile", "'av3-accttxt'",
                   "'av3-acctchip'", "'av3-acctchev'", "`v${hd.version || '?'}`"):
        assert marker in js, marker
    assert "S.me.user.email" in js
    assert "S.me.role ? S.me.role + ' · '" in js
    assert "hd.model_configured ? 'Model connected' : 'No model, demo replies'" in js
    # Mobile drawer (the left overlay on phones) gets the same hierarchy, sticky headings and pin mark.
    for marker in ("'av3-dhead'", "'av3-dgroup'", "'ditem av3-ditem'", "'av3-ditxt'",
                   "'ditem av3-dagent'", "av3-dfoot"):
        assert marker in js, marker
    # All labels and behaviour survive: groups, drawer entries, actions, version footer.
    for label in ("'Organisation'", "'Workspace'", "'Govern'", "'Connect'", "'Playbooks'", "'Account'",
                  "'Agents'", "'Council'", "'Teams'", "'Brain'", "'Research'", "'Control'",
                  "'Inventory'", "'Models & usage'", "'Apps'", "'Marketplace'", "'Plans & usage'",
                  "'Settings'", "'Load demo workspace'", "'Search the menu'",
                  "'Workspace owner'", "'Open dev mode, no login'"):
        assert label in js, label
    # English only in this batch's copy.
    for german in ("Meine", "verbunden", "Einstellungen", "Neue", "Arbeitsbereich"):
        assert german not in js


def test_sidebar_styles_are_appended_and_live_at_the_very_end(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    _, css = served(c)
    assert CSS_MARKER in css
    idx = css.index(CSS_MARKER)
    assert ".av3-" not in css[:idx], "batch-7 classes must only live in the marked block"
    block = css[idx:]
    assert block.strip().startswith(CSS_MARKER)
    assert css.rstrip().endswith("}")
    for selector in (".av3-agents", ".av3-group", ".av3-gcount", ".av3-agent", ".av3-agenttxt",
                     ".av3-pin", ".av3-unread",
                     ".acct.av3-acct", ".av3-acctchip", ".av3-dhead", ".av3-dgroup", ".av3-ditem",
                     ".av3-dfoot", ".av3-walk"):
        assert selector in block, selector
    # Wave-3 batch 15 moved the Connect-apps surface into its own flat block; the old gradient
    # selectors must be gone while the flat replacement is appended at the end.
    assert "/* ===== Batch 15 — Connector polish ===== */" in block
    assert ".appsbtn.mcp3-connect" in block
    assert ".appsbtn.av3-mcp" not in css
    # Prominent sticky group headings + a clear 3 px active bar.
    assert "position: sticky" in block and "text-transform: uppercase" in block
    assert "letter-spacing" in block and "font-weight: 700" in block
    assert "inset 3px 0 0 var(--accent)" in block
    # Light/dark via the design tokens, mobile-safe, no undefined --panel fallback trap.
    assert "prefers-color-scheme: dark" in block
    assert "@media (max-width: 760px)" in block
    assert "var(--surface)" in block
    assert "var(--panel" not in block
    # The old shared sidebar rules stay in place (this batch only appends).
    assert ".agents{flex:1;overflow:auto;padding:0 8px 8px}" in css
    assert ".agent[aria-current=true]{background:var(--surface);box-shadow:inset 3px 0 0 var(--accent),0 0 0 1px var(--line)}" in css
