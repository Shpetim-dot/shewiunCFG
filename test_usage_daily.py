"""Usage endpoint exposes a daily series for the chart."""
import time

from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import cfa_core as pf
from app import main


def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "u.db")
    for key in ("CFA_API_KEYS", "CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_BILLING"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.delenv("CFA_MODEL_API_KEY", raising=False)
    monkeypatch.setenv("CFA_ALLOW_SIGNUP", "1")
    auth_mod._ensured.clear()
    main.init_db()
    c = TestClient(main.app)
    c.get("/api/bots")  # seed workspace
    return c


def test_usage_reports_a_daily_series(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    with pf.db() as con:
        for i in range(3):
            con.execute("INSERT INTO llm_usage (id, ts, org_id, provider, model, kind, status, tokens_in, tokens_out, cost) "
                        "VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (f"u{i}", time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()), "default", "openai", "gpt-x", "chat", "ok", 10, 5, 0.0001))
        con.commit()
    u = c.get("/api/usage").json()
    assert u["daily"], "daily series missing"
    assert u["daily"][-1]["calls"] == 3
    assert u["daily"][-1]["tokens_in"] == 30
    assert "models" in u and "by_kind" in u
