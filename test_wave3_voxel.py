"""v22 — voxel agents (customisable), chat as profile, notification centre, calm organisation page.

The SPA has no bundler, so the served app.js / style.css are pinned by content, and the one new endpoint
(PUT /api/bots/{id}/look) is exercised end to end.
"""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main


def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "v22.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def served(c):
    js, css = c.get("/static/app.js"), c.get("/static/style.css")
    assert js.status_code == 200 and css.status_code == 200
    return js.text, css.text


def test_voxel_figure_is_flat_isometric_and_keeps_the_single_entry_point(tmp_path, monkeypatch):
    js, css = served(client(tmp_path, monkeypatch))
    block = js[js.index("// ---------- voxel agents"):js.index("const when = ")]
    assert "function tile(b, s = 40, o = {}) {" in block
    assert "return h('span', { class: 'avatar'" in block
    for marker in ("av-side", "av-top", "av-front", "av-ground", "av-tag", "av-sym", "SPRITES", "FIGURES", "lookOf"):
        assert marker in block, marker
    assert "Gradient" not in block and "url(#" not in block   # flat tones only
    assert "requestAnimationFrame" not in block and "pointermove" not in block   # no global gaze tracker
    assert "av3WalkToMessage" not in js                          # the agent speaks as a profile instead
    for sym in ("spark", "shield", "rocket", "bolt", "crown", "lock"):
        assert f"{sym}: [" in block
    assert ".av.thinking .av-fig" in css and "avHop" in css


def test_chat_shows_the_agent_as_a_profile(tmp_path, monkeypatch):
    js, css = served(client(tmp_path, monkeypatch))
    assert "function chatRow(b, m, prev)" in js and "msghead" in js and "chatTyping" in js
    assert ".msgrow.ai .msg.agent" in css and ".msghead" in css


def test_notification_centre_and_toasts(tmp_path, monkeypatch):
    js, css = served(client(tmp_path, monkeypatch))
    for marker in ("function toast(", "nt-tab", "nt-group", "markRead", "S.notifLoading", "'Mark all read'"):
        assert marker in js, marker
    assert ".nt-panel" in css and ".toasts" in css


def test_organisation_is_a_flat_workspace_page_with_stripe_invoices(tmp_path, monkeypatch):
    js, css = served(client(tmp_path, monkeypatch))
    org = js[js.index("function orgView() {"):js.index("function syncOverlays")]
    for marker in ("org2-nav", "'Members'", "'Billing'", "/api/billing/invoices", "/api/billing/portal", "MRR", "ARR", "owner (co-owner)", "Danger zone"):
        assert marker in org or marker in js, marker
    assert "class: 'card hero'" not in org
    assert ".org2-shell" in css


def test_settings_carry_the_logo_and_apps_open_without_a_full_rerender(tmp_path, monkeypatch):
    js, _ = served(client(tmp_path, monkeypatch))
    assert "set2-logo" in js and "/static/icon.png" in js
    apps = js[js.index("async function openApps()"):js.index("async function openAgent()")]
    assert "render();" not in apps and "run(" not in apps


def test_look_endpoint_changes_symbol_colour_and_figure_and_is_audited(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    bots = c.get("/api/bots").json()
    assert bots and "figure" in bots[0]
    bid = bots[0]["id"]
    r = c.put(f"/api/bots/{bid}/look", json={"icon": "rocket", "color": "#7A4E9C", "figure": "antenna"})
    assert r.status_code == 200, r.text
    got = next(b for b in c.get("/api/bots").json() if b["id"] == bid)
    assert (got["icon"], got["color"], got["figure"]) == ("rocket", "#7A4E9C", "antenna")
    audit = c.get("/api/security/audit?limit=50").json()["events"]
    assert any(e["event_type"] == "agent.look.changed" for e in audit)


def test_look_endpoint_rejects_bad_input(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    bid = c.get("/api/bots").json()[0]["id"]
    assert c.put(f"/api/bots/{bid}/look", json={"color": "red"}).status_code == 422
    assert c.put(f"/api/bots/{bid}/look", json={"figure": "dragon"}).status_code == 422
    assert c.put(f"/api/bots/{bid}/look", json={"icon": "<script>"}).status_code == 422
    assert c.put(f"/api/bots/{bid}/look", json={}).status_code == 422
    assert c.put("/api/bots/nope/look", json={"icon": "star"}).status_code == 404


def test_stylesheet_braces_are_balanced_so_no_block_swallows_the_rest(tmp_path, monkeypatch):
    """An unclosed @media once made every later rule (connector polish, flat shell, v22) apply only on phones."""
    _, css = served(client(tmp_path, monkeypatch))
    depth, in_comment = 0, False
    i = 0
    while i < len(css):
        two = css[i:i + 2]
        if in_comment:
            if two == "*/":
                in_comment, i = False, i + 1
        elif two == "/*":
            in_comment, i = True, i + 1
        elif css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
            assert depth >= 0
        i += 1
    assert depth == 0
