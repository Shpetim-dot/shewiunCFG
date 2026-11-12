"""Browser regressions for shared workspace navigation and modal keyboard access."""
import shutil

import pytest

from test_mobile import base, open_app

pw = pytest.importorskip("playwright.sync_api")


@pytest.fixture(scope="module")
def browser():
    with pw.sync_playwright() as p:
        executable = shutil.which("chromium")
        try:
            browser = p.chromium.launch(**({"executable_path": executable} if executable else {}))
        except Exception:
            if executable:
                raise
            pytest.skip("Install Playwright Chromium to run workspace browser checks")
        yield browser
        browser.close()


@pytest.fixture(scope="module")
def workspace_session(browser, base):
    """Authenticate once; UI coverage must not exhaust the real login throttle."""
    ctx, page, errors = open_app(browser, base, 1366, 900, touch=False)
    try:
        assert not errors, errors
        return ctx.storage_state()
    finally:
        ctx.close()


def open_workspace(browser, base, session, width, height=900, touch=False):
    ctx = browser.new_context(
        storage_state=session, viewport={"width": width, "height": height},
        is_mobile=touch and width < 800, has_touch=touch and width < 800,
    )
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(base + "/app")
    page.wait_for_selector("textarea", timeout=20000)
    return ctx, page, errors


@pytest.mark.parametrize("width", [360, 390, 430, 768, 1024, 1366, 1920])
def test_workspace_routes_and_overlay_keyboard_access(browser, base, workspace_session, width):
    ctx, page, errors = open_workspace(browser, base, workspace_session, width, touch=width < 800)
    try:
        if width <= 1180:
            page.get_by_role("button", name="Toggle agent details", exact=True).click()
            assert page.get_by_role("dialog", name="Agent details", exact=True).is_visible()
            assert page.locator(".main").evaluate("el => el.inert")
            page.keyboard.press("Shift+Tab")
            assert page.locator(".agx-panel").evaluate("el => el.contains(document.activeElement)")
            page.keyboard.press("Escape")
            assert page.locator(".agx-panel").count() == 0
            assert not page.locator(".main").evaluate("el => el.inert")
            assert page.get_by_role("button", name="Toggle agent details", exact=True).evaluate("el => el === document.activeElement")

        if width <= 760:
            page.locator(".mtab").filter(has_text="Control").click()
        else:
            page.get_by_role("navigation", name="Workspace navigation").get_by_role("button", name="Control", exact=True).click()
        page.get_by_role("heading", name="Agent control plane", exact=True).wait_for()
        assert page.evaluate("document.documentElement.scrollWidth") <= width

        page.locator(".mbar button[aria-label=Menu]" if width <= 760 else ".side button[aria-label=Menu]").click()
        menu = page.get_by_role("dialog", name="Main menu", exact=True)
        assert menu.is_visible()
        assert page.locator("#app").evaluate("el => el.inert")
        page.keyboard.press("Shift+Tab")
        assert menu.evaluate("el => el.contains(document.activeElement)")
        page.keyboard.press("Escape")
        assert not menu.is_visible()
        assert not page.locator("#app").evaluate("el => el.inert")
        assert not errors, errors
    finally:
        ctx.close()


def test_agent_details_adapt_from_dialog_to_desktop_panel(browser, base, workspace_session):
    ctx, page, errors = open_workspace(browser, base, workspace_session, 1024)
    try:
        page.emulate_media(color_scheme="dark", reduced_motion="reduce")
        page.get_by_role("button", name="Toggle agent details", exact=True).click()
        assert page.get_by_role("dialog", name="Agent details", exact=True).is_visible()
        page.set_viewport_size({"width": 1366, "height": 900})
        page.wait_for_function("() => !document.querySelector('.agx-panel').hasAttribute('aria-modal')")
        assert page.locator(".agx-panel").get_attribute("role") is None
        assert not page.locator(".main").evaluate("el => el.inert")
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_function("() => document.querySelector('.main').inert")
        assert page.get_by_role("dialog", name="Agent details", exact=True).is_visible()
        page.keyboard.press("Escape")
        assert page.locator(".agx-panel").count() == 0
        assert not errors, errors
    finally:
        ctx.close()


@pytest.mark.parametrize("width", [360, 390, 430, 768, 1024, 1366, 1920])
def test_control_approval_decisions_persist_at_each_width(browser, base, workspace_session, width):
    """A human decision must reach the backend; responsive buttons alone are insufficient."""
    ctx, page, errors = open_workspace(browser, base, workspace_session, width, touch=width < 800)
    try:
        csrf = next(cookie["value"] for cookie in ctx.cookies() if cookie["name"] == "cfa_csrf")
        requests = []
        for decision in ("approved", "rejected"):
            description = f"Responsive {width}px {decision} review"
            response = page.request.post(base + "/api/security/approvals", data={
                "action_type": "external.write", "description": description, "risk_level": "high",
            }, headers={"X-CSRF-Token": csrf})
            assert response.ok, response.text()
            approval = response.json()
            assert approval["status"] == "pending"
            requests.append((approval["id"], description, decision))
        if width <= 760:
            page.locator(".mtab").filter(has_text="Control").click()
        else:
            page.get_by_role("navigation", name="Workspace navigation").get_by_role("button", name="Control", exact=True).click()
        queue = page.get_by_role("region", name="Approval queue", exact=True)
        for approval_id, description, decision in requests:
            row = queue.locator(".ctl2-item").filter(has_text=description)
            with page.expect_response(lambda r: r.url.endswith(f"/api/security/approvals/{approval_id}/decision") and r.request.method == "POST") as result:
                row.get_by_role("button", name="Approve" if decision == "approved" else "Reject", exact=True).click()
            assert result.value.ok
            row.wait_for(state="detached")
            stored = page.request.get(base + "/api/security/approvals").json()
            assert next(item for item in stored if item["id"] == approval_id)["status"] == decision
        assert page.evaluate("document.documentElement.scrollWidth") <= width
        assert not errors, errors
    finally:
        ctx.close()
