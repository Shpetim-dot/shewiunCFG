"""Council stream: the meeting UI contract (start event, rounds, agent colors)."""
import asyncio
import json

from fastapi.testclient import TestClient
from starlette.requests import Request

from app import cfa_core as pf
from app import main


def test_council_start_event_carries_rounds_and_agent_colors(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "council.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    main.init_db()
    c = TestClient(main.app)
    c.get("/api/bots")  # seeds the council agents

    item = pf.CallIn(topic="Should we raise prices or add a cheaper plan?", bot_ids=["strategist", "skeptic"], rounds=2)

    async def first_event() -> dict:
        scope = {"type": "http", "method": "POST", "path": "/api/calls/stream",
                 "headers": [], "query_string": b"", "client": ("t", 1), "server": ("t", 80)}
        response = await pf.stream_call(item, Request(scope))
        async for chunk in response.body_iterator:
            line = chunk.decode() if isinstance(chunk, bytes) else str(chunk)
            assert line.startswith("data: ")
            return json.loads(line[len("data: "):])
        raise AssertionError("no start event")

    ev = asyncio.run(first_event())
    assert ev["type"] == "start"
    assert ev["rounds"] == 2
    assert len(ev["agents"]) == 2
    assert all(a.get("color") and a.get("icon") for a in ev["agents"]), ev
