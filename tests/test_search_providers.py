"""Web search providers (Brave, Tavily, Google) behind one function."""
import asyncio
import json

import httpx

from app import research


def run(coro):
    return asyncio.run(coro)


def test_no_key_means_no_search(monkeypatch):
    monkeypatch.delenv("CFA_SEARCH_API_KEY", raising=False)
    assert run(research.web_search("anything", 3)) == []


def test_brave_is_the_default_and_normalises_results(monkeypatch):
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "brave-key")
    monkeypatch.delenv("CFA_SEARCH_PROVIDER", raising=False)
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["token"] = request.headers.get("x-subscription-token")
        return httpx.Response(200, json={"web": {"results": [
            {"url": "https://example.com/a", "title": "<b>Example</b>", "description": "<p>Hello</p>"},
            {"url": "ftp://skip", "title": "bad", "description": ""}]}})

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    out = run(research.web_search("pricing", 5))
    assert "api.search.brave.com" in seen["url"] and seen["token"] == "brave-key"
    assert out == [{"kind": "web", "ref": "https://example.com/a", "title": "Example", "snippet": "Hello"}]


def test_tavily_provider(monkeypatch):
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "tvly-key")
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "tavily")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json={"results": [{"url": "https://example.org/x", "title": "T",
                                                     "content": "C"}]})

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    out = run(research.web_search("market", 3))
    assert "api.tavily.com" in seen["url"] and seen["body"]["api_key"] == "tvly-key"
    assert out[0]["ref"] == "https://example.org/x" and out[0]["snippet"] == "C"


def test_google_provider_and_errors_are_swallowed(monkeypatch):
    monkeypatch.setenv("CFA_SEARCH_API_KEY", "g-key")
    monkeypatch.setenv("CFA_SEARCH_CX", "cx-1")
    monkeypatch.setenv("CFA_SEARCH_PROVIDER", "google")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        return httpx.Response(200, json={"items": [{"link": "https://g.example/1", "title": "G", "snippet": "S"}]})

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    assert run(research.web_search("q", 2))[0]["ref"] == "https://g.example/1"
    assert "customsearch" in seen["url"] and "cx=cx-1" in seen["url"]

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(401, json={"error": "key not valid"})))
    assert run(research.web_search("q", 2)) == []
