"""Owner continuity: the last owner can never demote themselves into a lockout.

Wave-3a hotfix (user accidentally demoted their only owner to security_manager). The API now
refuses to remove the last active owner, and owners may invite/promote a co-owner so the role
can be handed over before the old owner steps down.
"""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "owner.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_DEV_TOKENS", "1")  # invitations return their token instead of only mailing it
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "owner@acme.example", "password": PASS,
                                           "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def me(c):
    r = c.get("/api/auth/me")
    assert r.status_code == 200, r.text
    return r.json()["user"]


def join(client, email, role):
    """Owner invites someone and that person accepts; returns the new member's client."""
    r = client.post("/api/org/invitations", json={"email": email, "role": role}, headers=csrf(client))
    assert r.status_code == 201, r.text
    token = r.json().get("token")
    assert token, "dev token missing; is CFA_DEV_TOKENS set for the test?"
    c2 = TestClient(main.app)
    r2 = c2.post("/api/org/invitations/accept", json={"token": token, "password": PASS, "name": email.split("@")[0]})
    assert r2.status_code == 201, r2.text
    return c2


def test_last_owner_cannot_demote_themselves(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    owner = me(c)
    r = c.patch(f"/api/org/members/{owner['id']}", json={"role": "security_manager"}, headers=csrf(c))
    assert r.status_code == 409, r.text
    assert "last owner" in r.json()["detail"]
    # Nothing changed and the session still works.
    assert me(c)["role"] == "owner"
    # The audit log does not claim a change that never happened.
    events = c.get("/api/security/audit?limit=20").json()["events"]
    assert not any(e["event_type"] == "org.role_changed" for e in events)


def test_owner_can_add_a_co_owner_and_then_hand_over(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    owner = me(c)
    co = join(c, "co@acme.example", "owner")
    assert me(co)["role"] == "owner"
    # Two owners now: the first may step down.
    r = c.patch(f"/api/org/members/{owner['id']}", json={"role": "security_manager"}, headers=csrf(c))
    assert r.status_code == 200, r.text
    # The remaining owner still cannot leave the workspace without an owner.
    co_id = me(co)["id"]
    r2 = co.patch(f"/api/org/members/{co_id}", json={"role": "developer"}, headers=csrf(co))
    assert r2.status_code == 409, r2.text
    assert me(co)["role"] == "owner"


def test_owner_can_promote_a_member_to_co_owner(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    owner = me(c)
    member = join(c, "dev@acme.example", "developer")
    member_id = me(member)["id"]
    r = c.patch(f"/api/org/members/{member_id}", json={"role": "owner"}, headers=csrf(c))
    assert r.status_code == 200, r.text
    members = {m["id"]: m for m in c.get("/api/org/members").json()["members"]}
    assert members[member_id]["role"] == "owner"
    r2 = c.patch(f"/api/org/members/{owner['id']}", json={"role": "security_manager"}, headers=csrf(c))
    assert r2.status_code == 200, r2.text


def test_admin_still_cannot_create_or_change_an_owner(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    admin = join(c, "admin@acme.example", "admin")
    admin_id = me(admin)["id"]
    # An admin cannot promote themselves or anyone else to owner.
    r = admin.patch(f"/api/org/members/{admin_id}", json={"role": "owner"}, headers=csrf(admin))
    assert r.status_code == 403, r.text
    # An admin cannot invite an owner either.
    r2 = admin.post("/api/org/invitations", json={"email": "other@acme.example", "role": "owner"}, headers=csrf(admin))
    assert r2.status_code == 403, r2.text
    # But an owner may invite a co-owner directly (covered in test_owner_can_add...).
    assert me(c)["role"] == "owner"
