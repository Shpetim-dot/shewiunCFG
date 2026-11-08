"""Public website: landing page, legal pages, contact form, SEO files, 404, security of the new surface."""
import re
import time

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main, site


def client(tmp_path, monkeypatch, keys=None, **env):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "site.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_LEGAL_NAME", "CFA_LEGAL_ADDRESS", "CFA_LEGAL_CITY", "CFA_CONTACT_EMAIL", "CFA_PUBLIC_URL"):
        monkeypatch.delenv(key, raising=False)
    if keys:
        monkeypatch.setenv("CFA_API_KEYS", keys)
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setattr(site, "_hits", type(site._hits)(site._hits.default_factory))
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


FORM = {"name": "Ada Lovelace", "email": "ada@example.com", "company": "Analytical", "topic": "pilot",
        "message": "We run a payments agent and would like a pilot.", "consent": "on"}


def test_landing_is_public_and_platform_moved_to_app(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, "adm:admin:A", CFA_PUBLIC_URL="https://shewiun.example")
    home = c.get("/")
    assert home.status_code == 200 and "AI agents your security team can sign off" in home.text
    assert "app.js" not in home.text and "<script>" not in home.text  # no platform code, no inline scripts (CSP)
    app = c.get("/app")
    assert app.status_code == 200 and "app.js?v=" in app.text
    # links from e-mails and Stripe keep opening the platform
    for q in ("/?reset=abc", "/?verify=abc", "/?invite=abc", "/?billing=success"):
        assert "app.js?v=" in c.get(q).text, q


def test_every_page_has_title_description_canonical_social_tags_and_icons(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, CFA_PUBLIC_URL="https://shewiun.example")
    for path in ("/", "/contact", "/privacy", "/terms", "/imprint", "/thank-you"):
        t = c.get(path).text
        title = re.search(r"<title>(.+?)</title>", t).group(1)
        desc = re.search(r'name="description" content="(.+?)"', t).group(1)
        assert 10 < len(title) <= 62 and 50 < len(desc) <= 160, path
        for needle in ('rel="canonical" href="https://shewiun.example', 'property="og:image" content="https://shewiun.example/static/site/img/og.jpg"',
                       'name="twitter:card" content="summary_large_image"', 'rel="icon"', 'rel="apple-touch-icon"', 'lang="en"'):
            assert needle in t, (path, needle)
    assert 'content="noindex' in c.get("/thank-you").text
    for img in ("og.jpg", "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-512.png", "workspace.webp"):
        assert c.get("/static/site/img/" + img).status_code == 200, img
    assert c.get("/favicon.ico").status_code == 200


def test_all_images_have_alt_text_and_dimensions(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    for path in ("/", "/contact", "/privacy", "/404-check"):
        for tag in re.findall(r"<img\b[^>]*>", c.get(path).text):
            assert "alt=" in tag, tag
            assert "width=" in tag and "height=" in tag, tag


def test_landing_has_the_required_sections_and_one_primary_call_to_action(tmp_path, monkeypatch):
    t = client(tmp_path, monkeypatch).get("/").text
    for anchor in ("product", "features", "how", "proof", "pricing", "faq"):
        assert f'id="{anchor}"' in t, anchor
    assert t.count('class="btn primary" href="/app" data-track="cta_open_app">Open the workspace') >= 1
    for needle in ("1 business day", "&euro;29", "&euro;99", "FAQPage", "SoftwareApplication", "sticky-cta", 'id="consent"', "Cookie settings", "/privacy", "/terms", "/imprint"):
        assert needle in t, needle


def test_local_schema_and_directions_only_appear_with_a_real_address(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    assert "PostalAddress" not in c.get("/").text and "Get directions" not in c.get("/contact").text
    c = client(tmp_path, monkeypatch, CFA_LEGAL_NAME="Acme GmbH", CFA_LEGAL_ADDRESS="Hauptstrasse 1", CFA_LEGAL_CITY="79576 Weil am Rhein", CFA_CONTACT_EMAIL="hello@example.com")
    assert '"streetAddress":"Hauptstrasse 1"' in c.get("/").text and "ProfessionalService" in c.get("/").text
    contact = c.get("/contact").text
    assert "https://www.google.com/maps/dir/?api=1&amp;destination=" in contact and "hello@example.com" in contact
    imprint = c.get("/imprint").text
    assert "Acme GmbH" in imprint and "Hauptstrasse 1" in imprint


def test_legal_values_are_html_escaped(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, CFA_LEGAL_NAME='<script>alert(1)</script>', CFA_LEGAL_ADDRESS='"><img src=x onerror=alert(1)>', CFA_LEGAL_CITY="X")
    for path in ("/imprint", "/privacy", "/terms", "/contact", "/"):
        t = c.get(path).text
        assert "<script>alert(1)" not in t and "<img src=x" not in t, path


def test_sitemap_robots_security_txt(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, CFA_PUBLIC_URL="https://shewiun.example", CFA_SECURITY_CONTACT="security@example.com")
    sm = c.get("/sitemap.xml")
    assert sm.status_code == 200 and "application/xml" in sm.headers["content-type"]
    for p in ("/", "/contact", "/privacy", "/terms", "/imprint"):
        assert f"<loc>https://shewiun.example{p}</loc>" in sm.text
    assert "/app<" not in sm.text and "thank-you" not in sm.text
    robots = c.get("/robots.txt").text
    assert "Sitemap: https://shewiun.example/sitemap.xml" in robots and "Disallow: /app" in robots and "Disallow: /api/" in robots
    assert "mailto:security@example.com" in c.get("/.well-known/security.txt").text


def test_custom_404_for_pages_and_json_404_for_the_api(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    r = c.get("/no-such-page")
    assert r.status_code == 404 and "404" in r.text and "text/html" in r.headers["content-type"] and 'content="noindex' in r.text
    api = c.get("/api/no-such-endpoint")
    assert api.status_code == 404 and api.headers["content-type"].startswith("application/json")


def test_contact_form_validates_stores_and_redirects(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, "adm:admin:A")
    bad = c.post("/contact", json={**FORM, "email": "nope"}, headers={"accept": "application/json"})
    assert bad.status_code == 422 and "email" in bad.json()["errors"]
    for field, value in (("name", "A"), ("message", "short"), ("consent", ""), ("topic", "x")):
        assert c.post("/contact", json={**FORM, field: value}, headers={"accept": "application/json"}).status_code == 422, field
    spam = c.post("/contact", json={**FORM, "message": "buy http://a.example http://b.example http://c.example now"}, headers={"accept": "application/json"})
    assert spam.status_code == 422
    ok = c.post("/contact", json=FORM, headers={"accept": "application/json"})
    assert ok.status_code == 201 and ok.json()["ok"] is True
    plain = c.post("/contact", data=FORM, follow_redirects=False)  # no JavaScript: a normal form post
    assert plain.status_code == 303 and plain.headers["location"] == "/thank-you"
    rejected = c.post("/contact", data={**FORM, "email": "x"}, follow_redirects=False)
    assert rejected.status_code == 303 and rejected.headers["location"].startswith("/contact?error=invalid")
    leads = c.get("/api/leads", headers={"authorization": "Bearer adm"}).json()
    assert [l["email"] for l in leads].count("ada@example.com") == 2 and leads[0]["source"] == "landing"


def test_contact_form_spam_protection(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, "adm:admin:A")
    h = c.post("/contact", json={**FORM, "website": "http://bot.example"}, headers={"accept": "application/json"})
    assert h.status_code == 201 and c.get("/api/leads", headers={"authorization": "Bearer adm"}).json() == []  # honeypot: dropped silently
    fast = c.post("/contact", json={**FORM, "ts": str(int(time.time() * 1000))}, headers={"accept": "application/json"})
    assert fast.status_code == 422 and fast.json()["code"] == "fast"
    slow = c.post("/contact", json={**FORM, "ts": str(int((time.time() - 30) * 1000))}, headers={"accept": "application/json"})
    assert slow.status_code == 201
    codes = [c.post("/contact", json=FORM, headers={"accept": "application/json"}).status_code for _ in range(6)]
    assert 429 in codes  # five per hour and connection


def test_leads_and_event_summary_are_admin_only_and_events_are_whitelisted(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, "adm:admin:A,vw:viewer:V")
    assert c.get("/api/leads").status_code == 401 and c.get("/api/events/summary").status_code == 401
    assert c.get("/api/leads", headers={"authorization": "Bearer vw"}).status_code == 403
    assert c.post("/api/events", json={"name": "landing_view"}).status_code == 201
    assert c.post("/api/events", json={"name": "<script>"}).status_code == 422
    summary = c.get("/api/events/summary", headers={"authorization": "Bearer adm"}).json()
    assert summary["last_30_days"]["landing_view"] == 1
    assert c.get("/api/bots").status_code == 401  # the platform API stays closed


def test_cors_is_closed_and_security_headers_are_on_every_page(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, "adm:admin:A")
    r = c.get("/", headers={"origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers
    pre = c.options("/api/leads", headers={"origin": "https://evil.example", "access-control-request-method": "POST"})
    assert "access-control-allow-origin" not in pre.headers
    for path in ("/", "/contact", "/privacy", "/no-such-page"):
        h = c.get(path).headers
        assert h["x-frame-options"] == "DENY" and h["x-content-type-options"] == "nosniff" and "frame-ancestors 'none'" in h["content-security-policy"]
        assert "object-src 'none'" in h["content-security-policy"] and "script-src 'self'" in h["content-security-policy"]
        assert "permissions-policy" in h and "referrer-policy" in h


def test_production_forces_https_and_adds_hsts(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch, "adm:admin:A", CFA_ENV="production", CFA_SECRET_KEY="x" * 40, CFA_PUBLIC_URL="https://shewiun.example")
    r = c.get("/privacy", headers={"x-forwarded-proto": "http"}, follow_redirects=False)
    assert r.status_code == 308 and r.headers["location"].startswith("https://")
    ok = c.get("/privacy", headers={"x-forwarded-proto": "https"}, follow_redirects=False)
    assert ok.status_code == 200 and "max-age=31536000" in ok.headers["strict-transport-security"]
    assert "upgrade-insecure-requests" in ok.headers["content-security-policy"]


def test_no_secrets_ship_in_the_frontend_files(tmp_path, monkeypatch):
    import pathlib
    root = pathlib.Path(main.STATIC)
    pattern = re.compile(r"(sk-[A-Za-z0-9]{20,}|sk_live_|pk_live_|whsec_|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC )?PRIVATE KEY|api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9]{16,})")
    for f in list(root.glob("*.js")) + list(root.glob("*.html")) + list((root / "site").glob("*")):
        if f.suffix in (".js", ".html", ".css"):
            assert not pattern.search(f.read_text(encoding="utf-8", errors="ignore")), f
