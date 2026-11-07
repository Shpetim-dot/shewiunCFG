"""Batch 3 — Teams: pop-in create/edit contract, PUT rename/branding fixes, static UI markers.

Pins the two real back-end bugs fixed with the team pop-in:
* PUT /api/teams/{id} now persists `name` (and keeps the agents' team label in sync);
* PUT without `icon`/`color` keeps the stored logo instead of resetting it to the defaults.

The static tests fetch the served `/static/app.js` and `/static/style.css` and assert the new
create/edit pop-in is present and the old inline "New team" form is gone.
"""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    """Fresh DB + one organisation with an owner session (admin)."""
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "b3.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_BILLING", "CFA_PLAN"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_DEMO_DELAY", "0")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "a@acme.example", "password": PASS, "name": "A", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def key_client(tmp_path, monkeypatch):
    """Key mode: an admin token plus a read-only member token in the same workspace."""
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "keys.db")
    for key in ("CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_BILLING", "CFA_PLAN"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_API_KEYS", "adm:admin:Alice,mem:member:Bob")
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def bot_ids(c):
    return [b["id"] for b in c.get("/api/bots").json()]


def make_team(c, **body):
    body.setdefault("name", "Risk desk")
    r = c.post("/api/teams", json=body, headers=csrf(c))
    assert r.status_code == 201, r.text
    return r.json()


# ---------- PUT: rename ----------

def test_put_rename_persists_and_moves_agents(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    ids = bot_ids(c)
    team = make_team(c, name="Risk desk", mission="old mission", members=ids[:2], icon="shield", color="#7A4E9C")

    r = c.put(f"/api/teams/{team['id']}", json={"name": "Risk committee", "mission": "new mission", "members": ids[:2]}, headers=csrf(c))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "Risk committee"
    assert body["id"] == team["id"] and body["space"] == team["space"]  # id/space stay stable

    listed = {t["id"]: t for t in c.get("/api/teams").json()}
    assert listed[team["id"]]["name"] == "Risk committee"
    assert listed[team["id"]]["mission"] == "new mission"
    # bots.team is the display label: it must follow the rename.
    bots = {b["id"]: b for b in c.get("/api/bots").json()}
    assert bots[ids[0]]["team"] == "Risk committee" and bots[ids[1]]["team"] == "Risk committee"

    events = c.get("/api/security/audit?limit=200").json()["events"]
    updated = [e for e in events if e["event_type"] == "team.updated"]
    assert updated, "team.updated audit event missing"
    payload = updated[0]["payload"]
    assert payload["team"] == team["id"] and payload["name"] == "Risk committee"
    assert set(payload["before"]) == set(ids[:2]) and set(payload["after"]) == set(ids[:2])


# ---------- PUT: icon/color preservation ----------

def test_put_without_icon_color_preserves_branding(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    team = make_team(c, name="Engineering", mission="Ship reliably", icon="rocket", color="#1B7F79")

    r = c.put(f"/api/teams/{team['id']}", json={"name": "Engineering", "mission": "Ship reliably, fast"}, headers=csrf(c))
    assert r.status_code == 200, r.text
    assert r.json()["icon"] == "rocket" and r.json()["color"] == "#1B7F79"

    # Explicit null also means "not provided"; only a string overwrites the stored logo.
    r = c.put(f"/api/teams/{team['id']}", json={"name": "Engineering", "mission": "m", "icon": None, "color": None}, headers=csrf(c))
    assert r.status_code == 200, r.text
    assert r.json()["icon"] == "rocket" and r.json()["color"] == "#1B7F79"

    listed = {t["id"]: t for t in c.get("/api/teams").json()}
    assert listed[team["id"]]["icon"] == "rocket" and listed[team["id"]]["color"] == "#1B7F79"


def test_put_with_icon_color_updates_branding(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    team = make_team(c, name="Branded", icon="rocket", color="#1B7F79")
    r = c.put(f"/api/teams/{team['id']}", json={"name": "Branded", "mission": "", "members": [], "icon": "shield", "color": "#7A4E9C"}, headers=csrf(c))
    assert r.status_code == 200, r.text
    assert r.json()["icon"] == "shield" and r.json()["color"] == "#7A4E9C"


# ---------- PUT: members ----------

def test_put_updates_members_and_keeps_name_when_omitted(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    ids = bot_ids(c)
    team = make_team(c, name="Risk desk", mission="m", members=ids[:2])

    r = c.put(f"/api/teams/{team['id']}", json={"mission": "m2", "members": [ids[1]]}, headers=csrf(c))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "Risk desk"  # omitted name is kept
    assert [m["id"] for m in body["members"]] == [ids[1]]

    bots = {b["id"]: b for b in c.get("/api/bots").json()}
    assert team["space"] not in bots[ids[0]]["spaces"]  # removed member lost the space
    assert team["space"] in bots[ids[1]]["spaces"]  # remaining member keeps it


def test_put_unknown_team_is_404(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.put("/api/teams/does-not-exist", json={"name": "Ghost team", "mission": "", "members": []}, headers=csrf(c))
    assert r.status_code == 404


# ---------- validation ----------

def test_put_name_validation(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    team = make_team(c, name="Risk desk")
    for bad in ("x", "a" * 41, ""):
        r = c.put(f"/api/teams/{team['id']}", json={"name": bad, "mission": "m", "members": []}, headers=csrf(c))
        assert r.status_code == 422, (bad, r.status_code, r.text)
    # the rejected writes changed nothing
    listed = {t["id"]: t for t in c.get("/api/teams").json()}
    assert listed[team["id"]]["name"] == "Risk desk"


def test_put_duplicate_name_is_409(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    make_team(c, name="Alpha team")
    beta = make_team(c, name="Beta team")
    r = c.put(f"/api/teams/{beta['id']}", json={"name": "Alpha team", "mission": "", "members": []}, headers=csrf(c))
    assert r.status_code == 409
    # renaming to the current name is not a conflict
    r = c.put(f"/api/teams/{beta['id']}", json={"name": "Beta team", "mission": "", "members": []}, headers=csrf(c))
    assert r.status_code == 200


# ---------- create defaults / delete ----------

def test_create_defaults_when_no_logo_given(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    team = make_team(c, name="Plain team", mission="")
    assert team["icon"] == "teams" and team["color"] == "#2F5BD3"
    # duplicate name is rejected, not silently created twice
    assert c.post("/api/teams", json={"name": "Plain team"}, headers=csrf(c)).status_code == 409


def test_delete_team_drops_space_and_audits(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    ids = bot_ids(c)
    team = make_team(c, name="Temp desk", members=[ids[0]])
    r = c.delete(f"/api/teams/{team['id']}", headers=csrf(c))
    assert r.status_code == 200 and r.json() == {"status": "removed"}
    assert c.get("/api/teams").json() == []
    bots = {b["id"]: b for b in c.get("/api/bots").json()}
    assert team["space"] not in bots[ids[0]]["spaces"]
    assert bots[ids[0]]["team"] == "General"
    events = c.get("/api/security/audit?limit=200").json()["events"]
    deleted = [e for e in events if e["event_type"] == "team.deleted"]
    assert deleted and deleted[0]["payload"]["team"] == team["id"]


# ---------- admin gate ----------

def test_team_writes_require_admin(tmp_path, monkeypatch):
    c = key_client(tmp_path, monkeypatch)
    adm, mem = {"Authorization": "Bearer adm"}, {"Authorization": "Bearer mem"}
    r = c.post("/api/teams", json={"name": "Risk desk", "mission": "m"}, headers=adm)
    assert r.status_code == 201, r.text
    team_id = r.json()["id"]

    assert c.get("/api/teams", headers=mem).status_code == 200  # reads stay open to members
    assert c.post("/api/teams", json={"name": "Blocked team"}, headers=mem).status_code == 403
    assert c.put(f"/api/teams/{team_id}", json={"name": "Blocked team", "mission": "", "members": []}, headers=mem).status_code == 403
    assert c.delete(f"/api/teams/{team_id}", headers=mem).status_code == 403
    # nothing was changed by the denied calls
    assert [t["name"] for t in c.get("/api/teams", headers=adm).json()] == ["Risk desk"]


# ---------- static UI markers ----------

def test_served_app_js_has_team_pop_in_create_and_edit(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.get("/static/app.js")
    assert r.status_code == 200
    js = r.text
    # pop-in open helper with create/edit mode
    assert "function openTeamModal(teamId, preselect)" in js
    assert "S.tedit" in js
    assert "Edit team" in js and "Create team" in js
    assert "Save changes" in js and "Delete team" in js
    assert "'Team created.'" in js and "'Team updated.'" in js and "'Team deleted.'" in js
    # edit mode is reachable from a card, create from header + context menu
    assert "openTeamModal(t.id)" in js
    assert "openTeamModal(null)" in js
    assert "act('Create team with this agent', () => openTeamModal(null, new Set([bot.id])))" in js
    # team cards: logo tile/avatar stack/channel badge/member counts
    assert "class: 'tm-stack'" in js
    assert "tile(m, 24)" in js
    assert "S.chanCounts[t.id]" in js
    # drawer entry for the Teams screen
    assert "it('Teams', 'Team memory and channels', 'teams', 'teams')" in js
    # badge() is now module scope; the drawer no longer declares its own copy
    assert "const badge = (n) => (n ? h('span', { class: 'badge' }, String(n)) : null);" in js
    assert "toLowerCase(), badge =" not in js
    # the old inline "New team" form is gone
    assert "h('h2', {}, 'New team')" not in js
    assert "S.tnew." not in js


def test_served_css_has_batch3_team_block(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.get("/static/style.css")
    assert r.status_code == 200
    css = r.text
    assert "/* ===== Batch 3 — Teams ===== */" in css
    assert ".tm-head" in css and ".tm-stack" in css and ".tm-mission" in css
    assert ".tm-picker" in css and ".tm-pick[aria-pressed=\"true\"]" in css
    assert "@media (max-width: 760px)" in css
    assert "@media (prefers-color-scheme: dark)" in css
