"""Wave 2 batch 12 — app-settings overlay v2, deep-research scroll fix, settings endpoints.

Static checks on the served SPA (the dialog structure, the scroll-preservation helper, English
copy) plus HTTP samples that every settings action the dialog uses is still reachable.
"""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"
GERMAN = ("Einstellungen", "Allgemein", "Berechtigungen", "Tresor", "Speichern", "Abbrechen",
          "Mitglieder", "Einladen", "Umsatz", "Mitteilungen", "Schlüssel", "Passwort")


def fresh(tmp_path, monkeypatch):
    """Fresh DB with one organisation and an owner session (admin)."""
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "w12.db")
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


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


# ---------- HTTP: every settings action the dialog reuses stays reachable ----------

def test_settings_dialog_endpoints_stay_reachable(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    h = csrf(c)

    # Readiness
    ready = c.get("/api/health/ready")
    assert ready.status_code in (200, 503)
    assert {"ready", "errors"} <= set(ready.json())
    health = c.get("/api/health").json()
    assert {"version", "auth", "warnings", "model_configured", "search_configured"} <= set(health)

    # Models: providers, suggestions and the connection test endpoint
    models = c.get("/api/models")
    assert models.status_code == 200
    body = models.json()
    assert {p["id"] for p in body["providers"]} == {"default", "hf"}
    assert body["suggested"] and body["free_tier_note"]
    tested = c.post("/api/models/test", json={"model": None}, headers=h)
    assert tested.status_code == 200
    assert {"ok", "provider", "model"} <= set(tested.json())

    # Search: status, save a provider without a key, then remove it again
    status0 = c.get("/api/search/status").json()
    assert {"provider", "configured", "key_source", "google_cx_set", "providers", "note"} <= set(status0)
    assert "exa" in status0["providers"]
    saved = c.put("/api/search/config", json={"provider": "exa", "api_key": ""}, headers=h)
    assert saved.status_code == 200
    assert c.get("/api/search/status").json()["provider"] == "exa"
    assert c.delete("/api/search/config", headers=h).status_code == 200

    # Access keys: create, list, revoke
    made = c.post("/api/admin/keys", json={"name": "QA laptop", "role": "member"}, headers=h)
    assert made.status_code == 201
    assert made.json()["token"].startswith("cfa_")
    listed = c.get("/api/admin/keys").json()
    assert {"keys", "env_keys", "note"} <= set(listed)
    assert made.json()["id"] in [k["id"] for k in listed["keys"]]
    assert c.delete(f"/api/admin/keys/{made.json()['id']}", headers=h).status_code == 200

    # Two-factor: the setup endpoint exists and returns a real secret (we do not enable it here)
    setup = c.post("/api/auth/mfa/setup", headers=h)
    assert setup.status_code == 200
    assert {"secret", "otpauth"} <= set(setup.json())

    # Backups and data: create, list, download, export (the retention endpoint is covered elsewhere)
    backup = c.post("/api/admin/backup", headers=h)
    assert backup.status_code == 201
    name = backup.json()["name"]
    assert name in [b["name"] for b in c.get("/api/admin/backups").json()]
    download = c.get(f"/api/admin/backups/{name}")
    assert download.status_code == 200 and len(download.content) > 0
    export = c.get("/api/admin/export")
    assert export.status_code == 200 and export.json()

    # Danger: the organisation deletion requires the owner and the slug confirmation
    assert c.delete("/api/org?confirm=wrong-slug", headers=h).status_code == 422


def test_settings_admin_endpoints_reject_members(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "w12k.db")
    monkeypatch.setenv("CFA_API_KEYS", "adm:admin:A,mem:member:B")
    for key in ("CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    main.init_db()
    c = TestClient(main.app)
    member = {"Authorization": "Bearer mem"}
    for path in ("/api/models", "/api/admin/keys", "/api/admin/backups", "/api/admin/export"):
        assert c.get(path, headers=member).status_code == 403, path
    # The dialog's non-admin reads still work, so the sections can render honest states.
    assert c.get("/api/health/ready", headers=member).status_code in (200, 503)
    assert c.get("/api/search/status", headers=member).status_code == 200
    assert c.get("/api/auth/me", headers=member).json()["role"] == "member"


# ---------- static: served JS ----------

def settings_block(js: str) -> str:
    start = js.index("// ---------- app settings (dialog) ----------")
    end = js.index("// live agent screen", start)
    return js[start:end]


def test_served_js_builds_the_settings_dialog(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    block = settings_block(js)
    # Left navigation with the seven sections from the task.
    for label in ("Readiness", "Models", "Search", "Access keys", "Two-factor", "Backups & data", "Danger"):
        assert label in block, label
    for marker in ("SET_SECTIONS", "settingsModal", "set2-modal", "set2-nav", "set2-navbtn",
                   "set2-content", "set2-sec", "set2-card", "set2-row", "set2-grouplabel",
                   "openSettings", "loadSettingsData", "settingsForm", "goSection"):
        assert marker in block, marker
    # Every existing settings action is reused (nothing simulated).
    for endpoint in ("/api/models/test", "/api/search/config", "/api/search/test", "/api/admin/keys",
                     "/api/auth/mfa/setup", "/api/auth/mfa/disable", "/api/admin/backup",
                     "/api/admin/backups", "/api/admin/export", "/api/admin/retention",
                     "/api/health/ready", "/api/org?confirm=", "/api/demo/workspace"):
        assert endpoint in block, endpoint
    # Honest states: admin gate, loading and error banner.
    assert "Admin only" in block and "set2-banner" in block and "Loading…" in block
    # The old single-screen settings layout is gone.
    assert "jump('set-health'" not in js
    assert js.count("function settingsView() {") == 1
    assert "Settings open as a dialog over the current screen." in js


def test_settings_dialog_wiring_and_overlay_branch(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    # Account popup + mobile drawer item + agent model editor link all open the dialog.
    assert "btn([icon('wrench', 16), 'Settings'], () => openSettings(), 'menuitem')" in js
    assert "it('Settings', 'Models, access keys, backups', 'wrench', 'settings', openSettings)" in js
    assert "btn('Settings', () => openSettings('models'), 'link')" in js
    assert "btn('Open settings', () => openSettings('search'), 'link')" in js
    # Legacy go('settings') calls land on the dialog instead of an empty screen.
    assert "if (view === 'settings') { openSettings(); return; }" in js
    assert "go('settings')" not in js
    # Overlay branch and signature include the settings state.
    assert "else if (m === 'settings') parts.push(settingsModal());" in js
    assert "const setSig = S.modal === 'settings'" in js
    assert "|set:" in js


def test_served_js_preserves_scroll_across_renders(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    assert "const SCROLL_SELECTORS" in js
    assert "function captureScrollState()" in js
    assert "function restoreScrollState(mem)" in js
    assert "stick to the bottom" in js.lower().replace("stick-to-bottom", "stick to the bottom")
    assert "const scrollMem = viewChanged ? null : captureScrollState();" in js
    assert "restoreScrollState(scrollMem);" in js
    # The old unconditional chat scroll is replaced by the captured state / first-render fallback.
    assert "const sc = document.getElementById('scroll'); if (sc) sc.scrollTop = sc.scrollHeight;" not in js
    # Deep research still re-renders on every stream event (the fix preserves the reader position).
    research = js[js.index("// ---------- research ----------"):js.index("function teamsView()")]
    assert "else if (ev.type === 'source')" in research
    assert research.count("render();") >= 3


def test_served_settings_copy_is_english(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    for word in GERMAN:
        assert word not in js, word


# ---------- static: served CSS ----------

def test_served_css_appends_the_settings_block(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    css = c.get("/static/style.css").text
    marker = "/* ===== Batch 12 — Settings & research ===== */"
    assert css.count(marker) == 1
    block = css[css.index(marker):]
    for cls in (".set2-modal", ".set2-body", ".set2-nav", ".set2-navbtn", ".set2-content",
                ".set2-sec", ".set2-card", ".set2-row", ".set2-controls", ".set2-actions",
                ".set2-banner", ".set2-newkey", ".set2-backuprow"):
        assert cls in block, cls
    assert "@media (prefers-color-scheme: dark)" in block
    assert "@media (max-width: 760px)" in block
    # Dark mode must use the shared surface token, never the undefined --panel variable.
    assert "--panel" not in block
    assert css.rstrip().endswith("}")  # the block is appended at the very end of the file
