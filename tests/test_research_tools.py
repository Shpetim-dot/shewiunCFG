"""Exa provider, Trafilatura extraction (with fallback) and the Ragas harness."""
import asyncio
import json
import subprocess
import sys
from pathlib import Path

import httpx

from app import research


def test_extract_text_strips_markup_without_trafilatura(monkeypatch):
    html = ("<html><head><style>.x{}</style><script>var a=1</script></head>"
            "<body><nav>menu</nav><h1>Pricing</h1><p>Plans start at 99 EUR&nbsp;per seat.</p>"
            "<footer>legal</footer></body></html>")
    text = research.extract_text(html)
    assert "Pricing" in text and "99 EUR" in text
    assert "<" not in text and "var a=1" not in text and "legal" not in text


def test_read_page_returns_clean_text(monkeypatch):
    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(200, headers={"content-type": "text/html"},
                                       text="<html><body><article><p>Supplier risk rose in 2025.</p></article></body></html>")))
    assert "Supplier risk" in asyncio.run(research.read_page("https://news.example/x"))


def test_read_page_errors_are_empty(monkeypatch):
    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(500, headers={"content-type": "text/html"}, text="boom")))
    assert asyncio.run(research.read_page("https://news.example/x")) == ""


def test_exa_provider_normalises_results(monkeypatch):
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "exa")
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "exa-key")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["key"] = request.headers.get("x-api-key")
        seen["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json={"results": [
            {"url": "https://ex.example/a", "title": "A", "highlights": ["Long readable text about agents."]}]})

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    out = asyncio.run(research.web_search("agent governance", 3, "Find governance vendors"))
    assert "api.exa.ai/search" in seen["url"] and seen["key"] == "exa-key"
    body = seen["body"]
    assert body["type"] == "auto" and body["contents"] == {"highlights": True}
    assert body["objective"] == "Find governance vendors" and body["numResults"] == 3
    assert out[0]["ref"] == "https://ex.example/a" and out[0]["kind"] == "web"
    assert "Long readable" in out[0]["snippet"]


def test_exa_is_an_accepted_provider_name():
    assert "exa" in research.search_status()["providers"]


def test_ragas_harness_is_honest_when_missing(tmp_path):
    script = Path(__file__).resolve().parents[1] / "tools" / "ragas_eval.py"
    db = tmp_path / "empty.db"
    import sqlite3
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE research (id TEXT, question TEXT, report TEXT, created_at TEXT)")
    con.commit()
    con.close()
    r = subprocess.run([sys.executable, str(script), "--db", str(db)], capture_output=True, text=True)
    assert r.returncode == 1 and "no stored reports" in r.stdout
