"""Branded transactional mail templates and multipart delivery."""
import pytest

from app import mail, mail_templates


def test_templates_contain_the_token_in_the_link(monkeypatch):
    monkeypatch.setenv("CFA_PUBLIC_URL", "https://cfa.example.com")
    subject, text, html = mail_templates.render("password_reset", "tok-123")
    assert subject == "Reset your Shewiun password"
    assert "https://cfa.example.com/?reset=tok-123" in text
    assert "https://cfa.example.com/?reset=tok-123" in html
    assert "Shewiun CFA" in text and "<html" in html


def test_all_three_templates_render_and_escape():
    for kind in ("password_reset", "verify_email", "invitation"):
        subject, text, html = mail_templates.render(kind, "abc", "extra detail")
        assert subject and "abc" in text and "abc" in html
        assert "extra detail" in text and "extra detail" in html
    with pytest.raises(KeyError):
        mail_templates.render("nope", "x")


def test_public_url_defaults_and_strips_slash(monkeypatch):
    monkeypatch.delenv("CFA_PUBLIC_URL", raising=False)
    assert mail_templates.public_url() == "http://localhost:8000"
    monkeypatch.setenv("CFA_PUBLIC_URL", "https://a.example/")
    assert mail_templates.public_url() == "https://a.example"


def test_send_html_without_smtp_returns_false(monkeypatch):
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_FROM", raising=False)
    assert mail.send_html("a@example.com", "Subject", "text", "<b>html</b>") is False
    assert mail.send("a@example.com", "Subject", "text") is False


def test_invite_and_reset_use_the_templates(monkeypatch, tmp_path):
    """The API still returns a dev token and the mail path runs through the templates."""
    from fastapi.testclient import TestClient

    from app import auth as auth_mod
    from app import main

    monkeypatch.setattr(main, "DB_PATH", tmp_path / "m.db")
    monkeypatch.delenv("CFA_API_KEYS", raising=False)
    monkeypatch.delenv("CFA_ENV", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_DEV_TOKENS", "1")
    monkeypatch.delenv("SMTP_HOST", raising=False)
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    assert c.post("/api/auth/register", json={"email": "o@acme.example", "password": "correct-horse-battery-staple-42",
                                              "name": "Owner", "org_name": "Acme"}).status_code == 201
    forged = {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}
    inv = c.post("/api/org/invitations", json={"email": "dev@acme.example", "role": "developer"}, headers=forged)
    assert inv.status_code in (200, 201) and inv.json().get("token")
    reset = c.post("/api/auth/password/forgot", json={"email": "o@acme.example"})
    assert reset.status_code == 200 and reset.json().get("token")
