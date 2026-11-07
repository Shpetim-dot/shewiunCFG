"""Two-factor authentication (TOTP): RFC vector, setup/enable, login gate, recovery, disable."""
import base64

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "m.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_AUTH_ATTEMPTS"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_AUTH_ATTEMPTS", "100")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "owner@acme.example", "password": PASS, "name": "Owner", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def code(secret: str) -> str:
    return auth_mod._totp(secret)


def login(client, password=PASS, mfa_code=""):
    return client.post("/api/auth/login", json={"email": "owner@acme.example", "password": password, "mfa_code": mfa_code})


def test_totp_matches_the_rfc6238_vectors():
    secret = base64.b32encode(b"12345678901234567890").decode().rstrip("=")
    assert auth_mod._totp(secret, 59) == "287082"
    assert auth_mod._totp(secret, 1111111109) == "081804"
    assert auth_mod._totp(secret, 1111111111) == "050471"
    assert auth_mod._totp(secret, 1234567890) == "005924"
    assert auth_mod._totp(secret, 2000000000) == "279037"
    assert auth_mod._totp(secret, 20000000000) == "353130"
    assert auth_mod._verify_totp(secret, auth_mod._totp(secret)) is True
    assert auth_mod._verify_totp(secret, "12345678") is False
    assert auth_mod._verify_totp(None, "123456") is False


def test_setup_requires_a_session(tmp_path, monkeypatch):
    fresh(tmp_path, monkeypatch)
    anon = TestClient(main.app)
    assert anon.post("/api/auth/mfa/setup").status_code == 401


def test_full_two_factor_flow(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)

    setup = c.post("/api/auth/mfa/setup", headers=csrf(c))
    assert setup.status_code == 200, setup.text
    body = setup.json()
    secret, otpauth = body["secret"], body["otpauth"]
    assert len(secret) >= 32 and otpauth.startswith("otpauth://totp/Shewiun:") and secret in otpauth
    assert body["digits"] == 6 and body["period"] == 30

    # a second setup while pending rotates the secret - use the newest one from here on
    setup2 = c.post("/api/auth/mfa/setup", headers=csrf(c))
    assert setup2.status_code == 200
    secret = setup2.json()["secret"]
    assert secret != body["secret"] and secret in setup2.json()["otpauth"]

    # a wrong code does not enable it
    bad = "000000" if code(secret) != "000000" else "111111"
    assert c.post("/api/auth/mfa/enable", json={"code": bad}, headers=csrf(c)).status_code == 401

    enabled = c.post("/api/auth/mfa/enable", json={"code": code(secret)}, headers=csrf(c))
    assert enabled.status_code == 200, enabled.text
    codes = enabled.json()["recovery_codes"]
    assert len(codes) == 8 and len(set(codes)) == 8
    assert c.get("/api/auth/me").json()["user"]["mfa_enabled"] is True
    assert c.post("/api/auth/mfa/enable", json={"code": code(secret)}, headers=csrf(c)).status_code == 409

    # login now needs the second factor
    anon = TestClient(main.app)
    no_code = login(anon)
    assert no_code.status_code == 401 and no_code.json()["detail"]["mfa_required"] is True
    assert login(anon, mfa_code=bad).status_code == 401
    ok = login(anon, mfa_code=code(secret))
    assert ok.status_code == 200 and ok.json()["user"]["mfa_enabled"] is True

    # recovery codes are single use
    anon2 = TestClient(main.app)
    assert login(anon2, mfa_code=codes[0]).status_code == 200
    again = TestClient(main.app)
    assert login(again, mfa_code=codes[0]).status_code == 401
    assert login(again, mfa_code=codes[1]).status_code == 200

    # disable needs password and a valid factor
    assert c.post("/api/auth/mfa/disable", json={"password": "wrong-password-1", "code": code(secret)}, headers=csrf(c)).status_code == 401
    assert c.post("/api/auth/mfa/disable", json={"password": PASS, "code": "000000"}, headers=csrf(c)).status_code == 401
    off = c.post("/api/auth/mfa/disable", json={"password": PASS, "code": code(secret)}, headers=csrf(c))
    assert off.status_code == 200 and off.json()["enabled"] is False
    assert c.get("/api/auth/me").json()["user"]["mfa_enabled"] is False

    # without 2FA the plain password login works again
    plain = TestClient(main.app)
    assert login(plain).status_code == 200


def test_disable_without_2fa_is_a_noop(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/auth/mfa/disable", json={"password": PASS, "code": ""}, headers=csrf(c))
    assert r.status_code == 200 and r.json().get("already") is True
