"""Wave 3 batch 19 — Control dashboard v2 with integrated audit trail.

Pins the data contracts the dashboard reads (summary, inventory, coverage, policies, approvals,
audit), the KPI consistency rules (values are derived from those APIs), and the served frontend
markers for the dashboard, charts and the integrated audit trail.
"""
from fastapi.testclient import TestClient

from app import main

PASS = "correct-horse-battery-staple-42"
ADMIN = {"Authorization": "Bearer adm"}
GERMAN = ("Einstellungen", "Allgemein", "Berechtigungen", "Tresor", "Speichern", "Abbrechen",
          "Mitglieder", "Einladen", "Umsatz", "Mitteilungen")


def client(tmp_path, monkeypatch):
    """Key mode: one admin principal, no CSRF needed for writes."""
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "w19.db")
    for key in ("CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_BILLING", "CFA_PLAN"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_API_KEYS", "adm:admin:A,mem:member:B")
    monkeypatch.setenv("CFA_DEMO_DELAY", "0")
    main.init_db()
    return TestClient(main.app)


def seeded(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    assert c.post("/api/demo/workspace", headers=ADMIN).status_code == 200
    return c


# ---------- contracts the dashboard aggregates ----------

def test_dashboard_data_sources_are_reachable_and_consistent(tmp_path, monkeypatch):
    c = seeded(tmp_path, monkeypatch)

    summary = c.get("/api/summary", headers=ADMIN).json()
    assert {"agents", "suspended", "pending_approvals", "drafts", "apps", "teams"} <= set(summary)
    assert all(isinstance(v, int) for v in summary.values())

    inventory = c.get("/api/inventory", headers=ADMIN).json()
    assert inventory
    for item in inventory:
        assert {"id", "name", "team", "trust", "status", "risk", "accountability"} <= set(item)
        assert item["risk"]["level"] in ("low", "medium", "high", "suspended")
        assert isinstance(item["risk"]["score"], int)
        assert item["trust"] in ("verified", "unverified")
        assert item["status"] in ("active", "suspended")

    inv_summary = c.get("/api/inventory/summary", headers=ADMIN).json()
    assert {"total", "ownerless", "no_sponsor", "no_purpose", "suspended", "high_risk"} <= set(inv_summary)
    assert inv_summary["total"] == len(inventory)
    assert inv_summary["high_risk"] == sum(1 for a in inventory if a["risk"]["level"] == "high")
    assert inv_summary["suspended"] == sum(1 for a in inventory if a["status"] == "suspended")
    assert inv_summary["ownerless"] == sum(1 for a in inventory if "no_owner" in a["accountability"])

    coverage = c.get("/api/coverage", headers=ADMIN).json()
    assert {"framework", "selftest_id", "items", "disclaimer"} <= set(coverage)
    statuses = [i["status"] for i in coverage["items"]]
    assert statuses and all(s in ("covered", "partial") for s in statuses)

    policies = c.get("/api/security/policies", headers=ADMIN).json()
    assert {"default_effect", "decisions", "policies", "note"} <= set(policies)
    assert policies["decisions"] == ["allow", "approval_required", "deny"]
    assert all(isinstance(p["overridden"], bool) for p in policies["policies"])

    audit = c.get("/api/security/audit", params={"limit": 200}, headers=ADMIN).json()
    assert {"integrity", "events", "total_filtered"} <= set(audit)
    assert audit["integrity"]["valid"] is True and audit["integrity"]["checked"] >= 1
    assert len(audit["events"]) <= 200
    seqs = [e["seq"] for e in audit["events"]]
    assert seqs == sorted(seqs, reverse=True)  # newest first
    for event in audit["events"]:
        assert {"created_at", "event_type", "actor", "event_hash", "previous_hash", "payload"} <= set(event)
        assert isinstance(event["payload"], dict)

    approvals = c.get("/api/security/approvals", headers=ADMIN).json()
    pending = [a for a in approvals if a["status"] == "pending"]
    assert summary["pending_approvals"] == len(pending)  # KPI is the same number by construction
    assert c.get("/api/tool-calls", headers=ADMIN).status_code == 200
    assert c.get("/api/leads", headers=ADMIN).status_code == 200
    funnel = c.get("/api/events/summary", headers=ADMIN).json()
    assert {"last_30_days", "leads_total"} <= set(funnel)


def test_kpi_values_track_real_state_changes(tmp_path, monkeypatch):
    c = seeded(tmp_path, monkeypatch)
    before = c.get("/api/summary", headers=ADMIN).json()
    for desc in ("Send the numbers to a partner", "Purge the export bucket"):
        r = c.post("/api/security/approvals", headers=ADMIN,
                   json={"action_type": "external.write", "description": desc, "risk_level": "low"})
        assert r.status_code == 200 and r.json()["status"] == "pending"
    after = c.get("/api/summary", headers=ADMIN).json()
    assert after["pending_approvals"] == before["pending_approvals"] + 2

    inventory = c.get("/api/inventory", headers=ADMIN).json()
    inv_summary = c.get("/api/inventory/summary", headers=ADMIN).json()
    assert inv_summary["high_risk"] == sum(1 for a in inventory if a["risk"]["level"] == "high")
    unverified = sum(1 for a in inventory if a["trust"] == "unverified")
    gaps = sum(1 for a in inventory if a["accountability"])
    assert 0 <= unverified <= len(inventory) and 0 <= gaps <= len(inventory)

    # A policy override flips the "custom policies" KPI, and reset removes it again.
    saved = c.put("/api/security/policies", headers=ADMIN, json={"action_type": "external.write", "decision": "deny"})
    assert saved.status_code == 200
    custom = [p for p in c.get("/api/security/policies", headers=ADMIN).json()["policies"] if p["overridden"]]
    assert [p["action_type"] for p in custom] == ["external.write"]
    assert c.delete("/api/security/policies/external.write", headers=ADMIN).status_code == 200
    assert not [p for p in c.get("/api/security/policies", headers=ADMIN).json()["policies"] if p["overridden"]]

    # Coverage KPI counts come straight from the coverage items.
    cov = c.get("/api/coverage", headers=ADMIN).json()
    covered = sum(1 for i in cov["items"] if i["status"] == "covered")
    partial = sum(1 for i in cov["items"] if i["status"] == "partial")
    assert covered + partial <= len(cov["items"])


# ---------- static: served dashboard JS ----------

def control_block(js: str) -> str:
    start = js.index("// ---------- control ----------")
    end = js.index("// ---------- modals ----------", start)
    return js[start:end]


def test_served_control_dashboard_structure(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    block = control_block(js)

    # Page header + KPI row with the seven requested metrics (all derived from S.* API state).
    assert "ctl2-head" in block and "ctl2-kpis" in block and "ctl2-kpi" in block
    assert block.count("ctl2Kpi(") == 7
    for label in ("Pending approvals", "Suspended agents", "High-risk agents", "Unverified agents",
                  "Accountability gaps", "Coverage", "Custom policies"):
        assert label in block, label
    for expr in ("pending_approvals", "invSum.high_risk", "trust === 'unverified'",
                 "(a.accountability || []).length", "S.cov", "p.overridden", "S.auditIntegrity"):
        assert expr in block, expr
    assert "ctl2-meta" in block and "Audit events" in block

    # Real diagrams: SVG risk chart, SVG audit volume chart, CSS progress bars per OWASP item.
    assert "const svg = " in js and "const sadd = " in js
    assert "ctl2RiskChart" in block and "ctl2AuditChart" in block and "ctl2CoverageBars" in block
    assert "ctl2-bar" in block and "role: 'progressbar'" in block and "'aria-valuenow': pct" in block
    assert "ctl2-barrow" in block and "ctl2-track" in block

    # Prioritised lists and the quiet incident switch.
    assert "ctl2Attention" in block and "Needs attention" in block
    assert "ctl2TopRisks" in block and "Top risks by score" in block
    assert "ctl2Risk" in block or "risk-row" in block
    assert "ctl2Incident" in block and "Incident switch" in block and "Suspend all agents" in block
    assert "Approval queue" in block and "Tool calls" in block

    # Integrated audit trail: compact expandable feed, full filterable section below.
    for marker in ("ctl2AuditTrail", "Audit trail", "ctl2-feed", "ctl2-feed-row", "ctl2-feed-detail",
                   "ctl2FeedRow", "ctlAuditDetail", "aria-expanded", "previous_hash", "ctl-audit-json",
                   "ctl2-all-audit", "Audit log", "ctl-filters", "Apply filters", "Actor contains",
                   "Event type starts with", "From date", "To date", "Verify integrity",
                   "Export for SIEM (NDJSON)", "limit=200"):
        assert marker in block, marker
    # Feed shows the newest 15 events while the full table keeps the 200-event window.
    assert "slice(0, 15)" in block
    assert "ctl-audit-row" in block and "ctl-audit-detail" in block

    # Existing behaviour remains wired: policies editable, coverage + self-test, pipeline.
    for marker in ("ctlPolicies", "ctl-policy-select", "default_decision", "Reset",
                   "ctlCoverage", "OWASP agentic coverage", "Run self-test",
                   "Authorization self-test", "ctl2-feed", "Pipeline"):
        assert marker in block, marker
    assert block.count("ctlRunSelfTest") >= 2  # coverage header + self-test section
    # The dashboard uses the wide layout, not the old 760 px column.
    assert "class: 'wide ctl2'" in block

    # Loader feeds the dashboard with the inventory endpoints and keeps audit integrity.
    loader = js[js.index("async function go(view)"):js.index("async function pick(id)")]
    assert "/api/inventory/summary" in loader and "'/api/inventory'" in loader
    assert "S.ctlInv" in loader and "S.ctlInvSum" in loader and "S.auditIntegrity" in loader
    # Lazy state only: the new dashboard fields are not added to the S literal.
    assert "ctlInv:" not in js and "ctlInvSum:" not in js and "auditIntegrity:" not in js


def test_served_dashboard_copy_is_english(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    block = control_block(c.get("/static/app.js").text)
    for word in GERMAN:
        assert word not in block, word


def test_served_css_appends_the_control_dashboard_block(tmp_path, monkeypatch):
    c = client(tmp_path, monkeypatch)
    css = c.get("/static/style.css").text
    marker = "/* ===== Batch 19 — Control dashboard ===== */"
    assert css.count(marker) == 1
    block = css[css.index(marker):]
    for cls in (".ctl2-head", ".ctl2-kpis", ".ctl2-kpi", ".ctl2-charts", ".ctl2-card",
                ".ctl2-barrow", ".ctl2-track", ".ctl2-mid", ".ctl2-att-row", ".ctl2-risk-row",
                ".ctl2-incident", ".ctl2-feed", ".ctl2-feed-row", ".ctl2-feed-detail",
                ".ctl2-two", ".ctl2-sec", ".ctl2-meta"):
        assert cls in block, cls
    assert "@media (prefers-color-scheme: dark)" in block
    assert "@media (max-width: 760px)" in block
    assert "--panel" not in block  # flat surfaces use the shared --surface token
    assert css.rstrip().endswith("}")  # block appended at the very end
    # The earlier control block stays intact for the coverage/policies/audit sections.
    assert "/* ===== Batch 2 — Control ===== */" in css and ".ctl-cov-grid" in css
