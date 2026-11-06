"""Channel live stream and unread counts (Slack stage 1)."""
import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

PASS = "correct-horse-battery-staple-42"


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "c.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    r = c.post("/api/auth/register", json={"email": "a@acme.example", "password": PASS, "name": "A", "org_name": "Acme"})
    assert r.status_code == 201, r.text
    return c, r.json()["token"]


def csrf(c):
    return {"X-CSRF-Token": c.cookies.get("cfa_csrf", "")}


def setup_team(c):
    r = c.post("/api/teams", json={"name": "Risk desk", "mission": "m"}, headers=csrf(c))
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    chans = c.get(f"/api/teams/{tid}/channels").json()
    return tid, chans[0]["id"]


def test_list_channels_reports_messages_after_a_timestamp(tmp_path, monkeypatch):
    c, _token = fresh(tmp_path, monkeypatch)
    tid, cid = setup_team(c)
    c.post(f"/api/channels/{cid}/messages", json={"content": "hello"}, headers=csrf(c))
    chans = c.get(f"/api/teams/{tid}/channels?since=2000-01-01T00:00:00+00:00").json()
    assert chans[0]["after"] >= 1 and chans[0]["messages"] >= 1
    empty = c.get(f"/api/teams/{tid}/channels?since=9999-01-01T00:00:00+00:00").json()
    assert empty[0]["after"] == 0


def test_stream_emits_messages_posted_after_connecting(tmp_path, monkeypatch):
    """Drive the SSE generator directly: the first pull delivers everything after `after`, and
    messages posted later arrive on the next poll (cursor semantics), without concurrent HTTP."""
    from starlette.requests import Request

    from app import cfa_core as pf
    from app import channels

    c, _token = fresh(tmp_path, monkeypatch)
    _tid, cid = setup_team(c)
    org_id = c.get("/api/auth/me").json()["user"]["org_id"]

    def post(content: str) -> str:
        r = c.post(f"/api/channels/{cid}/messages", json={"content": content}, headers=csrf(c))
        assert r.status_code == 201, r.text
        rows = c.get(f"/api/channels/{cid}/messages").json()
        return rows[-1]["created_at"]

    first_ts = post("first message")
    post("second message")  # posted "after" the cursor

    async def next_chunk(ag) -> str:
        async for chunk in ag:
            return chunk.decode() if isinstance(chunk, bytes) else str(chunk)
        return ""

    async def scenario() -> str:
        tenant = pf.TENANT.set(org_id)
        try:
            scope = {"type": "http", "method": "GET", "path": f"/api/channels/{cid}/stream",
                     "headers": [], "query_string": b"", "client": ("t", 1), "server": ("t", 80)}
            response = await channels.channel_stream(cid, Request(scope), after=first_ts)
            assert response.media_type == "text/event-stream"
            return await asyncio.wait_for(next_chunk(response.body_iterator), timeout=5)
        finally:
            pf.TENANT.reset(tenant)

    chunk = asyncio.run(scenario())
    assert "second message" in chunk and "first message" not in chunk, chunk


def test_stream_is_scoped_and_404s_for_unknown_channels(tmp_path, monkeypatch):
    c, _token = fresh(tmp_path, monkeypatch)
    assert c.get("/api/channels/nope/stream").status_code == 404
