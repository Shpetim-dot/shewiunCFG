"""Public website in front of the platform: landing page, legal pages, contact form, SEO files, custom 404.

Everything here is anonymous and read-mostly. The platform itself lives at /app and keeps its own
authentication; nothing on this module can read workspace data. Pages are plain files under
static/site/ with a few placeholders that are filled (and HTML-escaped) from environment variables:

    CFA_PUBLIC_URL        https://shewiun.duckdns.org            canonical origin (sitemap, social tags)
    CFA_LEGAL_NAME        legal name of the provider             imprint, privacy policy, terms
    CFA_LEGAL_ADDRESS     street and number                      imprint, local schema, directions
    CFA_LEGAL_CITY        postal code and city                   imprint, local schema, directions
    CFA_LEGAL_COUNTRY     country (default Germany)
    CFA_LEGAL_PHONE       optional
    CFA_LEGAL_VAT         optional VAT id
    CFA_CONTACT_EMAIL     where contact-form messages are mailed (when mail is configured) and shown on the pages
    CFA_SECURITY_CONTACT  optional, published in /.well-known/security.txt
"""
from __future__ import annotations

import html
import json
import os
import re
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, quote

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

SITE_DIR = Path(__file__).resolve().parent / "static" / "site"
PAGES = {"privacy": "privacy", "terms": "terms", "imprint": "imprint", "contact": "contact", "thank-you": "thank-you"}
SITEMAP_PATHS = ("/", "/contact", "/privacy", "/terms", "/imprint", "/trust")
# A query string on "/" means a link from an e-mail or from Stripe (?reset=, ?verify=, ?invite=, ?billing=):
# those must keep opening the platform, never the marketing page.
SPA_QUERY_KEYS = ("reset", "verify", "invite", "billing", "token", "demo", "login", "signup")
TOPICS = ("demo", "pilot", "pricing", "security", "other")
EMAIL = re.compile(r"^[^@\s<>\"',;]{1,64}@[^@\s<>\"',;]{1,190}\.[A-Za-z]{2,}$")
URLISH = re.compile(r"(https?://|www\.)", re.I)
MIN_FILL_SECONDS = 3
_hits: dict[str, deque] = defaultdict(deque)


def public_url() -> str:
    return (os.getenv("CFA_PUBLIC_URL") or "http://localhost:8000").rstrip("/")


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def legal() -> dict[str, str]:
    """Provider details for the legal pages. Missing values stay visibly open instead of being invented."""
    return {
        "name": _env("CFA_LEGAL_NAME"), "address": _env("CFA_LEGAL_ADDRESS"), "city": _env("CFA_LEGAL_CITY"),
        "country": _env("CFA_LEGAL_COUNTRY", "Germany"), "phone": _env("CFA_LEGAL_PHONE"), "vat": _env("CFA_LEGAL_VAT"),
        "email": _env("CFA_CONTACT_EMAIL"),
    }


def _has_address(d: dict[str, str]) -> bool:
    return bool(d["address"] and d["city"])


def _strip_block(text: str, tag: str, keep: bool) -> str:
    """<!--tag-->...<!--/tag--> blocks are dropped when keep is False and unwrapped otherwise."""
    pattern = re.compile(rf"<!--{tag}-->(.*?)<!--/{tag}-->", re.S)
    return pattern.sub(lambda m: m.group(1) if keep else "", text)


def _jsonld() -> str:
    d, base = legal(), public_url()
    org: dict[str, Any] = {
        "@context": "https://schema.org", "@type": "Organization", "@id": base + "/#org", "name": "SHEWIUN", "url": base + "/",
        "logo": base + "/static/site/img/icon-512.png", "description": "Workspace for AI agents with per-agent permissions, human approvals and a tamper-evident audit log.",
    }
    if d["email"]:
        org["email"] = d["email"]
    if _has_address(d):
        org["@type"] = ["Organization", "ProfessionalService"]
        org["address"] = {"@type": "PostalAddress", "streetAddress": d["address"], "addressLocality": d["city"], "addressCountry": d["country"]}
        org["areaServed"] = [{"@type": "Place", "name": "European Union"}, {"@type": "Place", "name": d["country"]}]
        org["hasMap"] = directions_url(d)
        if d["phone"]:
            org["telephone"] = d["phone"]
    app_ld = {
        "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Shewiun CFA", "applicationCategory": "SecurityApplication",
        "operatingSystem": "Web", "url": base + "/", "image": base + "/static/site/img/og.jpg",
        "description": "Council, Brain and Control workspace for AI agents: per-agent permissions, quarantined memory, human approvals, audit log and an authorization self-test.",
        "offers": [{"@type": "Offer", "name": n, "price": str(p), "priceCurrency": "EUR", "url": base + "/#pricing"}
                   for n, p in (("Free", 0), ("Starter", 29), ("Professional", 99))],
    }
    out = json.dumps([org, app_ld], ensure_ascii=False, separators=(",", ":"))
    return out.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")  # data only, and nothing can close the script tag


def directions_url(d: dict[str, str]) -> str:
    return "https://www.google.com/maps/dir/?api=1&destination=" + quote(f"{d['address']}, {d['city']}, {d['country']}")


def render(name: str) -> str | None:
    f = SITE_DIR / f"{name}.html"
    if not f.is_file():
        return None
    d, text = legal(), f.read_text(encoding="utf-8")
    text = _strip_block(text, "ADDR", _has_address(d))
    text = _strip_block(text, "EMAIL", bool(d["email"]))
    text = _strip_block(text, "PHONE", bool(d["phone"]))
    text = _strip_block(text, "VAT", bool(d["vat"]))
    esc = lambda v, fb="": html.escape(v or fb, quote=True)
    subs = {
        "__SITE_URL__": esc(public_url()), "__V__": esc(os.getenv("CFA_VERSION") or _version()),
        "{{LEGAL_NAME}}": esc(d["name"], "[Provider name: set CFA_LEGAL_NAME]"),
        "{{ADDRESS}}": esc(d["address"], "[Street: set CFA_LEGAL_ADDRESS]"), "{{CITY}}": esc(d["city"], "[Postal code and city: set CFA_LEGAL_CITY]"),
        "{{COUNTRY}}": esc(d["country"]), "{{PHONE}}": esc(d["phone"]), "{{VAT}}": esc(d["vat"]),
        "{{EMAIL}}": esc(d["email"], "[E-mail: set CFA_CONTACT_EMAIL]"), "{{DIRECTIONS_URL}}": esc(directions_url(d)) if _has_address(d) else "",
        "{{OSM_URL}}": esc("https://www.openstreetmap.org/search?query=" + quote(f"{d['address']}, {d['city']}")) if _has_address(d) else "",
        "{{JSONLD}}": _jsonld(),
    }
    for k, v in subs.items():
        text = text.replace(k, v)
    return text


def _version() -> str:
    from app import cfa_core
    return cfa_core.VERSION


def _page(name: str, status: int = 200) -> Response:
    body = render(name)
    if body is None:
        return HTMLResponse("<h1>Not found</h1>", status_code=404)
    return HTMLResponse(body, status_code=status)


def _ip(request: Request) -> str:
    return (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()


def _limited(key: str, limit: int, window: int) -> bool:
    q, t = _hits[key], time.monotonic()
    while q and t - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(t)
    return False


def _clean(v: Any, n: int) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(v or "")).strip()[:n]


def validate(data: dict[str, Any]) -> tuple[dict[str, str], dict[str, str]]:
    """Returns (clean values, errors by field). One place for the form rules, mirrored in site.js."""
    v = {"name": _clean(data.get("name"), 80), "email": _clean(data.get("email"), 254).lower(), "company": _clean(data.get("company"), 120),
         "topic": _clean(data.get("topic"), 20) or "demo", "message": _clean(data.get("message"), 2000)}
    err: dict[str, str] = {}
    if len(v["name"]) < 2 or "\n" in v["name"] or "\r" in v["name"]:
        err["name"] = "Please enter your name."
    if not EMAIL.match(v["email"]):
        err["email"] = "Please enter a valid e-mail address."
    if v["topic"] not in TOPICS:
        err["topic"] = "Please choose a topic."
    if len(v["message"]) < 10:
        err["message"] = "Please tell us a little more (at least 10 characters)."
    elif len(URLISH.findall(v["message"])) > 2:
        err["message"] = "Please remove some links from your message."
    if str(data.get("consent") or "").lower() not in ("on", "true", "1", "yes"):
        err["consent"] = "Please confirm that we may use your details to answer you."
    return v, err


async def _read_form(request: Request) -> dict[str, Any]:
    raw = await request.body()
    if len(raw) > 20_000:
        return {}
    if "json" in (request.headers.get("content-type") or ""):
        try:
            data = json.loads(raw or b"{}")
            return data if isinstance(data, dict) else {}
        except ValueError:
            return {}
    return {k: v[0] for k, v in parse_qs(raw.decode("utf-8", "replace"), keep_blank_values=True).items()}


def _store_lead(v: dict[str, str]) -> None:
    from app import cfa_core as pf
    with pf.db() as con:
        con.execute("INSERT INTO leads (id,created_at,name,email,company,message,source,org_id) VALUES (?,?,?,?,?,?,?,?)",
                    (os.urandom(5).hex(), pf._m().now(), v["name"], v["email"], v["company"], f"[{v['topic']}] {v['message']}", "landing", "site"))


def _notify(v: dict[str, str]) -> None:
    to = legal()["email"]
    if not to:
        return
    try:
        from app import mail
        if mail.configured():
            mail.send(to, f"New Shewiun enquiry ({v['topic']})", f"Name: {v['name']}\nE-mail: {v['email']}\nCompany: {v['company']}\nTopic: {v['topic']}\n\n{v['message']}\n")
    except Exception:  # the lead is stored either way
        pass


def install(app: FastAPI, spa: Callable[[], Response]) -> None:
    @app.middleware("http")
    async def force_https(request: Request, call_next):
        # Behind the proxy the original scheme arrives in X-Forwarded-Proto. Health checks come from inside (no header).
        if os.getenv("CFA_ENV") == "production" and request.headers.get("x-forwarded-proto", "https").lower() == "http" and request.url.path != "/api/health/ready":
            return RedirectResponse(str(request.url.replace(scheme="https")), status_code=308)
        return await call_next(request)

    @app.get("/", include_in_schema=False)
    def landing(request: Request) -> Response:
        if any(k in request.query_params for k in SPA_QUERY_KEYS):
            return spa()
        return _page("index")

    @app.get("/app", include_in_schema=False)
    def platform() -> Response:
        return spa()

    for route, name in PAGES.items():
        if route == "contact":
            continue
        app.add_api_route("/" + route, (lambda n: (lambda: _page(n)))(name), methods=["GET"], include_in_schema=False)

    @app.get("/contact", include_in_schema=False)
    def contact_page() -> Response:
        return _page("contact")

    @app.post("/contact", include_in_schema=False)
    async def contact_submit(request: Request) -> Response:
        wants_json = "application/json" in (request.headers.get("accept") or "") or "json" in (request.headers.get("content-type") or "")
        data = await _read_form(request)

        def fail(status: int, errors: dict[str, str], code: str) -> Response:
            if wants_json:
                return JSONResponse({"ok": False, "errors": errors, "code": code}, status_code=status)
            return RedirectResponse(f"/contact?error={code}#form", status_code=303)

        ip = _ip(request)
        if _limited("a:" + ip, 40, 3600):  # attempts, including mistakes a visitor corrects
            return fail(429, {"form": "Too many attempts. Please try again later."}, "rate")
        if _clean(data.get("website"), 200):  # honeypot: humans never see this field
            return JSONResponse({"ok": True}, status_code=201) if wants_json else RedirectResponse("/thank-you", status_code=303)
        try:
            opened = float(data.get("ts") or 0) / 1000
        except (TypeError, ValueError):
            opened = 0.0
        if opened and (time.time() - opened < MIN_FILL_SECONDS):  # a form filled faster than a human can type
            return fail(422, {"form": "That was fast. Please try again."}, "fast")
        clean, errors = validate(data)
        if errors:
            return fail(422, errors, "invalid")
        if _limited("c:" + ip, 5, 3600) or _limited("c:all", 60, 3600):  # stored messages: five per hour and connection
            return fail(429, {"form": "Too many messages. Please try again later."}, "rate")
        _store_lead(clean)
        _notify(clean)
        return JSONResponse({"ok": True}, status_code=201) if wants_json else RedirectResponse("/thank-you", status_code=303)

    @app.get("/sitemap.xml", include_in_schema=False)
    def sitemap() -> Response:
        base = public_url()
        urls = "".join(f"<url><loc>{html.escape(base + p)}</loc></url>" for p in SITEMAP_PATHS)
        return Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + "</urlset>", media_type="application/xml")

    @app.get("/robots.txt", include_in_schema=False)
    def robots() -> Response:
        return PlainTextResponse("User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api/\nDisallow: /thank-you\n\nSitemap: " + public_url() + "/sitemap.xml\n")

    @app.get("/.well-known/security.txt", include_in_schema=False)
    def security_txt() -> Response:
        contact = _env("CFA_SECURITY_CONTACT") or legal()["email"]
        if not contact:
            return PlainTextResponse("Not Found", status_code=404)
        c = contact if contact.startswith(("http", "mailto:")) else "mailto:" + contact
        return PlainTextResponse(f"Contact: {c}\nPreferred-Languages: en, de\nCanonical: {public_url()}/.well-known/security.txt\n")

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon() -> Response:
        return FileResponse(SITE_DIR / "img" / "favicon.ico", media_type="image/x-icon", headers={"Cache-Control": "public, max-age=86400"})

    @app.get("/site.webmanifest", include_in_schema=False)
    def manifest() -> Response:
        return JSONResponse({"name": "Shewiun", "short_name": "Shewiun", "start_url": "/app", "display": "standalone", "background_color": "#ffffff", "theme_color": "#1f5cff",
                             "icons": [{"src": "/static/site/img/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/static/site/img/icon-512.png", "sizes": "512x512", "type": "image/png"}]},
                            media_type="application/manifest+json")

    @app.exception_handler(StarletteHTTPException)
    async def not_found(request: Request, exc: StarletteHTTPException) -> Response:
        path = request.url.path
        if exc.status_code == 404 and request.method == "GET" and not path.startswith(("/api/", "/static/")):
            return _page("404", 404)
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))
