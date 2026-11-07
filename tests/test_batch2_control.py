"""Batch 2 — Control tab contracts.

Pins the OWASP coverage shape (honest evidence), editable org-scoped policies with real
enforcement, the filtered audit query, and the static UI surface of the Control tab.
"""
from fastapi.testclient import TestClient

from app import auth as auth_mod
from app import main

ADMIN = {"Authorization": "Bearer adm"}
MEMBER = {"Authorization": "Bearer mem"}


def fresh(tmp_path, monkeypatch):
    """Fresh DB with one admin (A) and one member (B); no CSRF needed for bearer requests."""
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "b2.db")
    for key in ("CFA_ENV", "CFA_ALLOW_SIGNUP", "CFA_MODEL_API_KEY", "CFA_BILLING", "CFA_PLAN"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("CFA_API_KEYS", "adm:admin:A,mem:member:B")
    monkeypatch.setenv("CFA_DEMO_DELAY", "0")
    auth_mod._ensured.clear()
    main.init_db()
    return TestClient(main.app)


def audit(c, **params):
    r = c.get("/api/security/audit", params=params, headers=ADMIN)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- OWASP agentic coverage ----------

def test_coverage_is_honest_before_and_after_a_self_test(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    cov = c.get("/api/coverage", headers=ADMIN).json()
    assert cov["framework"].startswith("OWASP Top 10 for Agentic Applications")
    assert "not a certification" in cov["disclaimer"]
    assert cov["selftest_id"] is None
    assert len(cov["items"]) == 7
    assert {i["id"] for i in cov["items"]} == {
        "goal-hijack", "ASI02", "ASI03", "ASI06", "rogue", "inter-agent", "supply-chain"}
    for item in cov["items"]:
        assert {"id", "name", "status", "controls", "gaps", "evidence"} <= set(item)
        assert item["status"] in ("covered", "partial")
        assert item["controls"] and item["gaps"]
        # No self-test run yet: the UI must say so, never invent pass counts.
        assert item["evidence"] == {"passed": 0, "total": 0}
    assert any(i["status"] == "covered" for i in cov["items"])
    assert any(i["status"] == "partial" for i in cov["items"])

    assert c.post("/api/selftest", headers=MEMBER).status_code == 403
    # Connected apps and their grants are what most probes exercise, like a real workspace.
    assert c.post("/api/demo/workspace", headers=ADMIN).status_code == 200
    run = c.post("/api/selftest", headers=ADMIN)
    assert run.status_code == 200, run.text
    assert run.json()["id"]
    latest = c.get("/api/selftest/latest", headers=ADMIN).json()
    assert latest["id"] == run.json()["id"]

    cov2 = c.get("/api/coverage", headers=ADMIN).json()
    assert cov2["selftest_id"] == run.json()["id"]
    items = {i["id"]: i for i in cov2["items"]}
    for key in ("goal-hijack", "ASI02", "ASI03", "ASI06", "rogue", "supply-chain"):
        ev = items[key]["evidence"]
        assert ev["total"] > 0, key
        assert 0 <= ev["passed"] <= ev["total"], key
    # "inter-agent" has no matching probes at all; an honest UI still shows "no evidence".
    assert items["inter-agent"]["evidence"]["total"] == 0


# ---------- editable policies ----------

def test_policy_get_exposes_effective_and_default_decisions(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    pol = c.get("/api/security/policies", headers=ADMIN).json()
    assert pol["default_effect"] == "deny for unknown action types"
    assert pol["decisions"] == ["allow", "approval_required", "deny"]
    assert isinstance(pol["note"], str) and pol["note"]
    policies = {p["action_type"]: p for p in pol["policies"]}
    assert set(policies) == {"project.create", "brain.write", "council.run", "external.write",
                             "external.delete", "secrets.read", "shell.execute"}
    for p in policies.values():
        assert p["decision"] == p["default_decision"]
        assert p["overridden"] is False
        assert p["description"]
    assert policies["external.write"]["decision"] == "approval_required"
    assert policies["secrets.read"]["decision"] == "deny"


def test_policy_put_delete_roundtrip_with_validation_and_audit(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    # Admin gate and validation.
    assert c.put("/api/security/policies", json={"action_type": "external.write", "decision": "allow"},
                 headers=MEMBER).status_code == 403
    assert c.delete("/api/security/policies/external.write", headers=MEMBER).status_code == 403
    assert c.put("/api/security/policies", json={"action_type": "not.a.real.action", "decision": "allow"},
                 headers=ADMIN).status_code == 422
    assert c.put("/api/security/policies", json={"action_type": "external.write", "decision": "yolo"},
                 headers=ADMIN).status_code == 422

    saved = c.put("/api/security/policies", json={"action_type": "external.write", "decision": "allow"},
                  headers=ADMIN)
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["action_type"] == "external.write"
    assert body["decision"] == "allow"
    assert body["default_decision"] == "approval_required"
    assert body["overridden"] is True

    listed = {p["action_type"]: p for p in c.get("/api/security/policies", headers=ADMIN).json()["policies"]}
    assert listed["external.write"]["decision"] == "allow"
    assert listed["external.write"]["overridden"] is True
    assert listed["external.write"]["default_decision"] == "approval_required"
    assert listed["external.delete"]["overridden"] is False  # other action types are untouched

    # Audit event carries the old and the new decision.
    changed = [e for e in audit(c, event_type="policy.changed")["events"] if e["event_type"] == "policy.changed"]
    assert len(changed) == 1
    assert changed[0]["payload"] == {"action_type": "external.write", "old": "approval_required", "new": "allow"}
    assert changed[0]["actor"] == "A"

    # Reset restores the built-in default and is audited.
    reset = c.delete("/api/security/policies/external.write", headers=ADMIN)
    assert reset.status_code == 200, reset.text
    assert reset.json()["decision"] == "approval_required"
    assert reset.json()["default_decision"] == "approval_required"
    assert reset.json()["overridden"] is False
    listed = {p["action_type"]: p for p in c.get("/api/security/policies", headers=ADMIN).json()["policies"]}
    assert listed["external.write"]["overridden"] is False
    events = [e for e in audit(c)["events"] if e["event_type"] == "policy.reset"]
    assert len(events) == 1 and events[0]["payload"]["action_type"] == "external.write"
    assert events[0]["payload"]["old"] == "allow"
    assert events[0]["payload"]["new"] == "approval_required"

    # Unknown action types cannot be reset either.
    assert c.delete("/api/security/policies/not.a.real.action", headers=ADMIN).status_code == 404


def test_policy_override_changes_real_enforcement(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)

    def approve(risk="low"):
        r = c.post("/api/security/approvals", json={
            "action_type": "external.write",
            "description": "Send the quarterly numbers to a partner",
            "risk_level": risk,
        }, headers=ADMIN)
        assert r.status_code == 200, r.text
        return r.json()

    # Built-in default: an external write always waits for a human.
    assert approve()["status"] == "pending"

    # Allowing the action really changes approval behaviour.
    c.put("/api/security/policies", json={"action_type": "external.write", "decision": "allow"}, headers=ADMIN)
    allowed = approve()
    assert allowed["status"] == "approved"
    assert allowed["decision_by"] == "policy-engine"
    assert allowed["decision_note"] == "Policy decision: allow"

    # High risk still needs a human decision even when the policy allows the action.
    assert approve(risk="high")["status"] == "pending"

    # Denying the action rejects it automatically.
    c.put("/api/security/policies", json={"action_type": "external.write", "decision": "deny"}, headers=ADMIN)
    denied = approve()
    assert denied["status"] == "rejected"
    assert denied["decision_note"] == "Policy decision: deny"

    # Reset returns to the default rule.
    c.delete("/api/security/policies/external.write", headers=ADMIN)
    assert approve()["status"] == "pending"

    # Unknown action types never become configurable and stay denied.
    unknown = c.post("/api/security/approvals", json={
        "action_type": "shell.execute.via.unknown",
        "description": "Try an action that is not in the policy map",
        "risk_level": "low",
    }, headers=ADMIN).json()
    assert unknown["status"] == "rejected"


# ---------- filtered audit query ----------

def _seed_audit(c):
    assert c.post("/api/teams", json={"name": "Risk desk", "mission": "Quarterly access review"},
                  headers=ADMIN).status_code == 201
    assert c.post("/api/brain/notes", json={"title": "Spend cap rule", "body": "Payments need approval."},
                  headers=ADMIN).status_code == 201
    assert c.post("/api/brain/notes", json={"title": "Member note", "body": "Written by a member."},
                  headers=MEMBER).status_code == 201
    assert c.post("/api/security/panic", json={"action": "suspend_all", "reason": "drill"},
                  headers=ADMIN).status_code == 200


def test_audit_filters_by_actor_type_date_and_combinations(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    _seed_audit(c)

    all_events = audit(c, limit=200)
    assert all_events["integrity"]["valid"] is True
    assert all_events["total_filtered"] == len(all_events["events"]) >= 4
    seqs = [e["seq"] for e in all_events["events"]]
    assert seqs == sorted(seqs, reverse=True)  # newest first
    for event in all_events["events"]:
        assert {"id", "seq", "event_type", "actor", "payload", "previous_hash",
                "event_hash", "created_at", "org_id"} <= set(event)
        assert isinstance(event["payload"], dict)

    types = {e["event_type"] for e in all_events["events"]}
    assert {"team.created", "brain.note.created", "security.suspend_all"} <= types
    assert {e["actor"] for e in all_events["events"]} >= {"A", "B"}

    # event_type is a prefix filter, like the NDJSON export.
    teams = audit(c, event_type="team")
    assert teams["events"] and teams["total_filtered"] == len(teams["events"])
    assert all(e["event_type"].startswith("team") for e in teams["events"])
    assert audit(c, event_type="brain.note")["total_filtered"] >= 2

    # actor is a substring filter (SQL LIKE, case-insensitive for ASCII).
    by_a = audit(c, actor="A", limit=200)
    assert by_a["events"] and all("a" in e["actor"].lower() for e in by_a["events"])
    by_b = audit(c, actor="B", limit=200)
    assert by_b["events"] and all("b" in e["actor"].lower() for e in by_b["events"])
    assert not audit(c, actor="nobody-matches-this")["events"]

    # since / until are compared against created_at, same as the export.
    oldest_ts = all_events["events"][-1]["created_at"]
    newest_ts = all_events["events"][0]["created_at"]
    assert audit(c, since=oldest_ts, limit=200)["total_filtered"] == len(all_events["events"])
    assert audit(c, since=newest_ts + "z")["events"] == []  # after every stored event
    assert audit(c, since="9999-01-01T00:00:00+00:00")["events"] == []
    # until is inclusive: only the oldest event can be <= its own timestamp.
    assert audit(c, until=oldest_ts)["total_filtered"] == 1
    assert audit(c, until="2000-01-01")["events"] == []

    # combinations narrow the result set.
    combo = audit(c, actor="A", event_type="team", since=oldest_ts, until=newest_ts, limit=200)
    assert combo["events"] and combo["total_filtered"] == len(combo["events"])
    for event in combo["events"]:
        assert event["event_type"].startswith("team") and "a" in event["actor"].lower()
    assert combo["total_filtered"] <= teams["total_filtered"]

    # limit is clamped to 1..200 and total_filtered reports the full match count.
    assert len(audit(c, limit=0)["events"]) == 1
    assert len(audit(c, limit=1)["events"]) == 1
    assert len(audit(c, limit=999)["events"]) <= 200
    assert audit(c, limit=1)["total_filtered"] == all_events["total_filtered"]

    # Reading the audit list needs a principal but no admin role.
    assert c.get("/api/security/audit", headers=MEMBER).status_code == 200


# ---------- static UI surface ----------

def test_served_control_ui_has_coverage_policies_and_audit_markers(tmp_path, monkeypatch):
    c = fresh(tmp_path, monkeypatch)
    js = c.get("/static/app.js").text
    css = c.get("/static/style.css").text

    # OWASP traffic-light section.
    for marker in ("OWASP agentic coverage", "ctl-cov", "ctl-dot", "Run self-test",
                   "No self-test run yet — evidence will appear after you run the self-test",
                   "probes passed", "not covered"):
        assert marker in js, marker

    # The redundant self-test shortcuts are gone; only the in-tab section keeps the phrase.
    assert js.count("Authorization self-test") == 1
    assert "Authorization self-test'], () => go('control')" not in js
    assert "it('Self-test'" not in js
    assert "OWASP coverage" not in js
    assert "Mitglieder" not in js

    # The Control drawer entry describes the whole tab.
    assert "Coverage, approvals, audit, policies, self-test" in js

    # Editable policy card.
    for marker in ("ctl-policy", "ctl-policy-select", "Approval required",
                   "default_decision", "custom", "Reset"):
        assert marker in js, marker

    # Audit filter bar + expandable row detail.
    for marker in ("ctl-audit-filter", "ctl-filters", "Apply filters", "Actor contains",
                   "Event type starts with", "From date", "To date", "ctl-audit-count",
                   "Verify integrity", "Export for SIEM (NDJSON)",
                   "ctl-audit-row", "ctl-audit-detail", "ctl-audit-json",
                   "previous_hash", "aria-expanded"):
        assert marker in js, marker
    assert "limit=200" in js

    # Stylesheet block for the new components, light/dark/mobile aware.
    assert "/* ===== Batch 2 — Control ===== */" in css
    for marker in (".ctl-cov-grid", ".ctl-dot.ok", ".ctl-dot.warn", ".ctl-dot.bad",
                   ".ctl-policy-select", ".ctl-filters", ".ctl-audit-row",
                   ".ctl-audit-json", ".ctl-audit-detail"):
        assert marker in css, marker
    batch_css = css.split("/* ===== Batch 2 — Control ===== */", 1)[1]
    assert "@media (prefers-color-scheme: dark)" in batch_css
    assert "@media (max-width: 760px)" in batch_css
