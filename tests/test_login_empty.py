"""An empty database must not answer a login with "wrong password"."""
import pytest
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "empty.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def test_login_on_empty_database_explains_the_problem(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    r = c.post("/api/auth/login", json={"email": "owner@example.com", "password": PASS})
    assert r.status_code == 409
    assert "no account" in r.json()["detail"].lower()


def test_login_works_after_the_first_registration(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    assert c.post("/api/auth/register", json={"email": "owner@example.com", "password": PASS,
                                              "org_name": "Acme"}).status_code == 201
    other = TestClient(main.app)
    assert other.post("/api/auth/login", json={"email": "owner@example.com", "password": PASS}).status_code == 200
    assert other.post("/api/auth/login", json={"email": "owner@example.com", "password": "wrong-password-1"}).status_code == 401
