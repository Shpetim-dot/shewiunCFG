"""Batch 6 (Plans): plan-block quotes, seat-aware checkout and the plan/upgrade UI markers.

The price model is only the PLANS list: a plan costs its launch price per seat block and a
block covers PLANS[plan].limits.seats people. No per-seat rate and no discount rate exist.
"""
import re
from urllib.parse import parse_qs

import httpx
import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import billing, main

PASS = "correct-horse-battery-staple-42"


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def fresh(tmp_path, monkeypatch, name="b6.db", **env):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / name)
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_BILLING",
                "CFA_PLAN", "STRIPE_SECRET_KEY", "CFA_CONTACT_URL"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    monkeypatch.setenv("CFA_DEMO_DELAY", "0")
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def owner(c, email="a@acme.example", org="Acme"):
    r = c.post("/api/auth/register", json={"email": email, "password": PASS, "name": "A", "org_name": org})
    assert r.status_code == 201, r.text
    return r.json()


# ---------- pure quote math (no request needed) ----------
def test_quote_uses_whole_seat_blocks_from_the_plan_price():
    free = billing.quote("free", 5)
    assert (free["plan"], free["plan_name"], free["included_seats"]) == ("free", "Free", 3)
    assert free["seats"] == 5 and free["blocks"] == 2
    assert free["unit_price_eur"] == 0 and free["amount_eur"] == 0 and free["monthly_total_eur"] == 0
    assert free["custom"] is False and free["currency"] == "EUR"
    assert free["line_items"][0]["quantity"] == 2 and free["line_items"][0]["amount_eur"] == 0

    assert billing.quote("free", 1)["blocks"] == 1
    assert billing.quote("free", 3)["blocks"] == 1

    for seats, blocks, total in ((1, 1, 29), (10, 1, 29), (11, 2, 58), (17, 2, 58), (20, 2, 58)):
        q = billing.quote("starter", seats)
        assert (q["blocks"], q["amount_eur"], q["monthly_total_eur"]) == (blocks, total, total)
        assert q["unit_price_eur"] == 29 and q["included_seats"] == 10
        assert q["line_items"][0]["label"] == "Starter plan — seat block (10 seats)"
        assert q["line_items"][0]["quantity"] == blocks
        assert q["line_items"][0]["unit_price_eur"] == 29
        assert q["line_items"][0]["amount_eur"] == total

    assert billing.quote("professional", 25)["blocks"] == 1
    assert billing.quote("professional", 25)["amount_eur"] == 99
    assert billing.quote("professional", 26)["blocks"] == 2
    assert billing.quote("professional", 26)["amount_eur"] == 198
    assert billing.quote("professional", 50)["amount_eur"] == 198


def test_quote_keeps_enterprise_custom_without_a_number():
    q = billing.quote("enterprise", 50)
    assert q["custom"] is True and q["blocks"] == 1 and q["included_seats"] == 200
    assert q["unit_price_eur"] is None and q["amount_eur"] is None and q["monthly_total_eur"] is None
    assert q["line_items"][0]["amount_eur"] is None
    # a second block is still described, but there is no self-serve total
    q2 = billing.quote("enterprise", 201)
    assert q2["blocks"] == 2 and q2["custom"] is True and q2["monthly_total_eur"] is None


def test_quote_rejects_unknown_plans_and_bad_seat_counts():
    for plan in ("gold", "premium", ""):
        with pytest.raises(HTTPException) as exc:
            billing.quote(plan, 3)
        assert exc.value.status_code == 404
    for seats in (0, -1, 10_001):
        with pytest.raises(HTTPException) as exc:
            billing.quote("starter", seats)
        assert exc.value.status_code == 422


# ---------- HTTP endpoint ----------
def test_quote_endpoint_is_the_same_calculation_and_works_with_billing_off(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)  # CFA_BILLING is not set: enforcement off
    owner(c)
    r = c.get("/api/billing/quote", params={"plan": "starter", "seats": 17})
    assert r.status_code == 200, r.text
    q = r.json()
    assert q["blocks"] == 2 and q["amount_eur"] == 58 and q["monthly_total_eur"] == 58
    assert q["line_items"][0]["quantity"] == 2 and q["currency"] == "EUR"
    assert q["enabled"] is False and q["custom"] is False and q["limits"]["seats"] == 10
    prof = c.get("/api/billing/quote", params={"plan": "professional", "seats": 26}).json()
    assert prof["blocks"] == 2 and prof["amount_eur"] == 198
    ent = c.get("/api/billing/quote", params={"plan": "enterprise", "seats": 10}).json()
    assert ent["custom"] is True and ent["monthly_total_eur"] is None
    assert c.get("/api/billing").json()["plans"][1]["seats_included"] == 10


def test_quote_endpoint_honours_enabled_flag_and_aliases(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch, CFA_BILLING="on")
    owner(c)
    q = c.get("/api/billing/quote", params={"plan": "pro", "seats": 10}).json()
    assert q["plan"] == "professional" and q["enabled"] is True and q["amount_eur"] == 99
    assert c.get("/api/billing/quote", params={"plan": "starter", "seats": 0}).status_code == 422
    assert c.get("/api/billing/quote", params={"plan": "starter", "seats": 10_001}).status_code == 422
    assert c.get("/api/billing/quote", params={"plan": "gold", "seats": 1}).status_code == 404
    assert c.get("/api/billing/quote", params={"seats": 1}).status_code == 422  # plan is required


def test_quote_endpoint_requires_a_principal_once_a_user_exists(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    owner(c)
    anonymous = TestClient(main.app)  # separate cookie jar: no session
    assert anonymous.get("/api/billing/quote", params={"plan": "starter", "seats": 1}).status_code == 401
    assert anonymous.get("/api/billing").status_code == 401


# ---------- checkout: quantity = seat blocks ----------
def stripe_client(tmp_path, monkeypatch, **env):
    c = fresh(tmp_path, monkeypatch, CFA_BILLING="on", STRIPE_SECRET_KEY="sk_test_x",
              STRIPE_PRICE_STARTER="price_starter", STRIPE_PRICE_PROFESSIONAL="price_pro",
              APP_URL="https://app.example.com", **env)
    owner(c)
    calls: list = []
    st = FastAPI()

    @st.post("/v1/checkout/sessions")
    async def sessions(req: Request):
        form = parse_qs((await req.body()).decode())
        calls.append({"auth": req.headers.get("authorization"), "form": form})
        return {"url": "https://checkout.stripe.com/c/pay/abc"}

    monkeypatch.setattr(billing, "STRIPE_TRANSPORT", httpx.ASGITransport(app=st))
    return c, calls


def test_checkout_bills_the_quoted_seat_blocks(tmp_path, monkeypatch):
    c, calls = stripe_client(tmp_path, monkeypatch)
    r = c.post("/api/billing/checkout", json={"plan": "starter", "seats": 17}, headers=csrf(c))
    assert r.status_code == 200 and r.json()["url"].startswith("https://checkout.stripe.com/")
    form = calls[0]["form"]
    assert form["line_items[0][price]"] == ["price_starter"]
    assert form["line_items[0][quantity]"] == ["2"]
    assert form["metadata[seats]"] == ["17"] and form["metadata[blocks]"] == ["2"]
    assert form["metadata[plan]"] == ["starter"] and form["subscription_data[metadata][blocks]"] == ["2"]
    assert c.post("/api/billing/checkout", json={"plan": "professional", "seats": 26}, headers=csrf(c)).status_code == 200
    assert calls[1]["form"]["line_items[0][quantity]"] == ["2"]
    assert calls[1]["form"]["metadata[blocks]"] == ["2"]


def test_checkout_without_seats_stays_one_block(tmp_path, monkeypatch):
    c, calls = stripe_client(tmp_path, monkeypatch)
    assert c.post("/api/billing/checkout", json={"plan": "professional"}, headers=csrf(c)).status_code == 200
    form = calls[0]["form"]
    assert form["line_items[0][quantity]"] == ["1"]
    assert form["metadata[blocks]"] == ["1"] and form["metadata[seats]"] == ["1"]


def test_checkout_still_refuses_free_unpriced_and_invalid_seats(tmp_path, monkeypatch):
    c, calls = stripe_client(tmp_path, monkeypatch)
    assert c.post("/api/billing/checkout", json={"plan": "free"}, headers=csrf(c)).status_code == 422
    assert c.post("/api/billing/checkout", json={"plan": "enterprise", "seats": 5}, headers=csrf(c)).status_code == 503
    assert c.post("/api/billing/checkout", json={"plan": "starter", "seats": 0}, headers=csrf(c)).status_code == 422
    assert c.post("/api/billing/checkout", json={"plan": "starter", "seats": 10_001}, headers=csrf(c)).status_code == 422
    assert calls == []


# ---------- static UI markers ----------
def test_plans_ui_contains_quote_table_and_invoice_dialog(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    assert "Compare plans" in js
    assert "Included seats" in js and "Seat block" in js
    assert "Continue to checkout" in js and "Billed monthly, no hidden fees" in js
    assert "S.modal = 'upgrade'" in js and "m === 'upgrade'" in js
    assert "/api/billing/quote" in js
    # upgrade(plan) must open the invoice dialog instead of checking out directly.
    body = re.search(r"function upgrade\(plan[^)]*\)\s*\{(.*?)\n  \}", js, re.S)
    assert body, "upgrade(plan) not found"
    assert "S.modal = 'upgrade'" in body.group(1)
    assert "location.href" not in body.group(1)
    assert "/api/billing/checkout" not in body.group(1)


def test_plans_styles_are_appended_in_a_marked_batch_block(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    css = c.get("/static/style.css").text
    assert "/* ===== Batch 6 — Plans ===== */" in css
    assert ".planx-" in css
    assert css.rstrip().endswith("}")  # block is appended at the very end of the file
