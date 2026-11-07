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
    start = js.index("const EYES = {")
    end = js.index("const when = ", start)
    return js[start:end]


def send_js(js):
    body = re.search(r"async function send\(\)\s*\{(.*?)\n  \}", js, re.S)
    assert body, "send() not found"
    return body.group(1)


# ---------- the 3-D avatar plate ----------
def test_avatar_plate_is_shaded_with_gradients_rim_and_contact_shadow(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, _ = served(c)
    block = avatar_js(js)
    # The plate is still the same 48x48 viewBox and the same single entry point.
    assert 'setAttribute(\'viewBox\', \'0 0 48 48\')' in block
    assert "function tile(b, s = 40, o = {}) {" in block
    assert "return h('span', { class: 'avatar'" in block
    # Dimensional shading: radial plate light, inner shade, rim highlight, gloss and contact shadow.
    for marker in ("radialGradient", "linearGradient", "av3-plate-hi", "av3-plate-mid", "av3-plate-lo",
                   "av3-shade-hi", "av3-shade-lo", "av3-rim-hi", "av3-rim-lo", "av3-drop-in",
                   "av3-base", "av3-gloss", "av3-drop"):
        assert marker in block, marker
    # Ring arcs keep their identity colours but gain a shadow + highlight depth layer.
    assert block.count('class="av3-arc-sh"') == 1  # built once inside the arc map
    assert 'class="av3-arc-hi"' in block
    assert "stroke-width=\"3.6\"" in block
    # Specular catch-lights live in the gaze/blink group, never on closed eyes.
    assert "const EYE_SPEC = {" in block
    assert 'class="av3-spec"' in block
    assert "blink\">${EYES[f.eyes]" in block and "${EYE_SPEC[f.eyes] || ''}" in block
    # The figure itself is colour-filled: a per-agent body gradient (primary ring colour) plus a
    # secondary-colour glow, both derived from faceOf() so every agent keeps its own palette.
    assert "const c0 = f.ring[0], c1 = f.ring[1];" in block
    assert "const bodyHi = mix(c0, .55)" in block and "bodyLo = mix(c0, -.38)" in block
    assert 'id="av3c${uid}"' in block and 'id="av3t${uid}"' in block
    assert 'stop-color="${bodyHi}"' in block and 'stop-color="${c1}" stop-opacity=".55"' in block
    assert 'class="av3-body"' in block and 'class="av3-tint"' in block
    assert 'fill="url(#av3c${uid})"' in block and 'fill="url(#av3t${uid})"' in block
    # Identity arcs stay distinguishable: they use the pale secondary colour on the coloured body.
    assert "arcC = mix(c1, .52)" in block and 'stroke="${arcC}"' in block
    # Every identity source is untouched.
    for marker in ("const EYES = {", "const BROWS = {", "const MOUTHS = {", "const ARC_ANGLES = {",
                   "const CORE_FACE = {", "strategist:", "skeptic:", "builder:", "chair:",
                   "'#3B6FE0'", "'#F2A93B'", "'#E5484D'", "'#16A37F'", "'#7A4E9C'"):
        assert marker in block, marker
    # Existing animation hooks survive: rotating ring, blinking, talking, floating, thinking halo.
    assert "o.float ? ' float' : ''" in block and "o.thinking ? ' thinking' : ''" in block
    assert 'class="halo"' in block and 'class="ring"' in block and 'class="look"' in block
    # No per-frame JS for an idle face: the SVG is static markup, only the shared gaze tracker moves it.
    assert "requestAnimationFrame(av3GazeFrame)" in js


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
def test_one_global_gaze_tracker_moves_the_look_group_with_raf(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, _ = served(c)
    # Exactly one document-level pointer tracker for all avatars (never one listener per tile).
    assert js.count("document.addEventListener('pointermove'") == 1
    assert "e.target.closest('.avatar')" in js
    assert "requestAnimationFrame(av3GazeFrame)" in js
    assert "AV3_GAZE_MAX" in js and "2.1" in js
    # It transforms the existing .look group and flags the plate, then restores the centre on leave.
    assert "function av3ClearGaze(el)" in js
    assert "look.style.transform = `translate(" in js
    assert "look.style.transform = ''" in js
    assert "classList.add('av3-gaze')" in js and "classList.remove('av3-gaze')" in js
    assert "document.addEventListener('pointerout'" in js
    assert "window.addEventListener('blur'" in js
    # Touch devices and reduced motion keep the current idle behaviour.
    assert "prefers-reduced-motion: reduce" in js
    assert "(hover: hover) and (pointer: fine)" in js
    assert "e.pointerType" in js and "'mouse'" in js and "'pen'" in js
    # The gaze class suppresses the thinking look-around animation while the pointer is on the avatar.
    assert ".av.av3-gaze .look { animation: none; }" in served(c)[1]
    assert ".av .look { transition: transform .12s ease-out; }" in served(c)[1]


# ---------- walk-to-message ----------
def test_new_live_agent_reply_walks_an_avatar_to_the_bubble(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js, css = served(c)
    body = send_js(js)
    # Only a newly appended agent reply triggers the walk, never history loading (pick()).
    assert "const before = S.msgs.length;" in body
    assert "last.role === 'agent' && S.msgs.length > before" in body
    assert "av3WalkToMessage(S.bot)" in body
    assert js.count("av3WalkToMessage") == 2  # definition + the single live-reply call in send()
    pick = re.search(r"async function pick\(id\)\s*\{(.*?)\n  \}", js, re.S)
    assert pick and "av3WalkToMessage" not in pick.group(1)
    # Fixed-position overlay walker: no layout shift, removed after the animation.
    assert "function av3WalkToMessage(bot)" in js
    assert "document.querySelectorAll('#scroll .msgs .msg.agent')" in js
    assert "'av3-walk'" in js
    assert "--av3-dx" in js and "--av3-dy" in js
    assert "document.body.append(walker)" in js
    assert "walker.addEventListener('animationend', stop)" in js
    assert "if (walker.parentNode) walker.remove()" in js
    # CSS keyframes: <=900 ms, fixed, pointer-events off, removed / skipped for reduced motion.
    idx = css.index(CSS_MARKER)
    block = css[idx:]
    assert ".av3-walk { position: fixed;" in block
    assert "pointer-events: none;" in block
    assert "@keyframes av3Walk" in block
    assert "animation: av3Walk .82s" in block
    assert "calc(var(--av3-dx" in block
    assert "prefers-reduced-motion: reduce" in block and ".av3-walk { display: none !important;" in block
    # The sidebar row class .agent also matches chat bubbles; the message region keeps normal flow.
    assert ".msgs .msg { display: block; }" in block


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
    # Connect-apps button: status dot driven by the real connected-app count + count text + MCP chip.
    assert "'appsbtn av3-mcp'" in js
    assert "class: 'av3-dot' + (S.sum.apps ? ' on' : '')" in js
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
                     ".av3-pin", ".av3-unread", ".appsbtn.av3-mcp", ".av3-dot", ".av3-mcp-badge",
                     ".acct.av3-acct", ".av3-acctchip", ".av3-dhead", ".av3-dgroup", ".av3-ditem",
                     ".av3-dfoot", ".av3-walk"):
        assert selector in block, selector
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
