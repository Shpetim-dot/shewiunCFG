"""Internet Archive snapshot lookup."""
import asyncio
import httpx
from app import research


def test_snapshot_available(monkeypatch):
    def handler(request):
        assert "archive.org/wayback/available" in str(request.url)
        return httpx.Response(200, json={"archived_snapshots": {"closest": {
            "available": True, "url": "https://web.archive.org/web/20250101000000/https://ex.example/a",
            "timestamp": "20250101000000", "status": "200"}}})
    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(handler))
    out = asyncio.run(research.research_snapshot("https://ex.example/a"))
    assert out["available"] is True and out["timestamp"] == "20250101000000"
    assert out["snapshot"].startswith("https://web.archive.org/")


def test_snapshot_missing_and_errors(monkeypatch):
    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(200, json={"archived_snapshots": {}})))
    assert asyncio.run(research.research_snapshot("https://ex.example/a"))["available"] is False

    monkeypatch.setattr(research, "SEARCH_TRANSPORT", httpx.MockTransport(
        lambda request: httpx.Response(500, text="down")))
    assert asyncio.run(research.research_snapshot("https://ex.example/a"))["available"] is False


def test_snapshot_rejects_other_schemes():
    import pytest
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        asyncio.run(research.research_snapshot("file:///etc/passwd"))
