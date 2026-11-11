"""Real-browser checks for the phone layout (skipped when Playwright/Chromium is not installed).

A screenshot that looks right is not enough: these tests tap, type and scroll at phone, tablet and desktop widths.
Run: pip install playwright && playwright install chromium && pytest tests/test_mobile.py
"""
import os
import socket
import subprocess
import sys
import time
import urllib.request

import pytest

pw = pytest.importorskip("playwright.sync_api")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="module")
def base(tmp_path_factory):
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    env = dict(os.environ, CFA_DATABASE_PATH=str(tmp_path_factory.mktemp("m") / "m.db"), CFA_DEMO_DELAY="0.01")
    for k in ("CFA_API_KEYS", "CFA_ENV", "CFA_DATABASE_URL", "DATABASE_URL"):
        env.pop(k, None)
    srv = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(port)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    url = f"http://127.0.0.1:{port}"
    try:
        for _ in range(60):
            try:
                urllib.request.urlopen(url + "/api/health", timeout=2); break
            except Exception:
                time.sleep(0.5)
        yield url
    finally:
        srv.terminate()


@pytest.fixture(scope="module")
def browser():
    with pw.sync_playwright() as p:
        try:
            b = p.chromium.launch()
        except Exception as exc:  # browser binary missing
            pytest.skip(f"Chromium not available: {exc}")
        yield b
        b.close()


def open_app(browser, base, width, height=844, touch=True):
    ctx = browser.new_context(viewport={"width": width, "height": height}, is_mobile=touch and width < 800, has_touch=touch and width < 800)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(base + "/app")
    page.wait_for_selector("input[type=password], textarea", timeout=20000)
    if page.query_selector("input[type=password]"):
        page.fill("input[aria-label=Email]", "tester@example.com"); page.fill("input[type=password]", "correct-horse-battery-9")
        if page.query_selector("input[aria-label='Your name']"):  # first start: this creates the workspace
            page.fill("input[aria-label='Your name']", "Tester"); page.fill("input[aria-label=Organisation]", "Acme")
            page.click("text=Create workspace")
        else:
            page.keyboard.press("Enter")
    page.wait_for_selector("textarea", timeout=20000)
    try:
        page.click("text=Skip for now", timeout=2500)
    except Exception:
        pass
    return ctx, page, errors


@pytest.mark.parametrize("width", [360, 390, 430])
def test_phone_layout_has_tab_bar_sheet_and_no_overflow(browser, base, width):
    ctx, page, errors = open_app(browser, base, width)
    assert page.is_visible(".mtabs"), "bottom tab bar is missing on phones"
    assert page.evaluate("document.documentElement.scrollWidth") <= width
    # touch targets: the top bar and the tab bar buttons are at least 44 px
    for sel in (".mbar .ibtn", ".mtab"):
        for box in page.eval_on_selector_all(sel, "els => els.filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })"):
            assert box[0] >= 43 and box[1] >= 43, (sel, box)
    # the agent details are a sheet you can open and close
    page.click("button[aria-label='Toggle agent details']")
    assert page.is_visible(".agx-panel")
    page.click(".sheet-close")
    assert not page.is_visible(".agx-panel")
    # a message goes out with the send button (Enter is a new line on a touch keyboard) and the reply shows as a profile row
    page.fill(".composer textarea", f"Hello from {width}px")
    page.click(".composer button")
    page.wait_for_function("document.querySelectorAll('.msgrow.ai .msghead, .msgrow.ai.cont').length > 0", timeout=15000)
    # the tab bar steps aside while the keyboard is up, and the composer stays reachable
    page.focus(".composer textarea")
    assert not page.is_visible(".mtabs")
    page.evaluate("document.activeElement.blur()")
    page.wait_for_timeout(200)
    # navigation by tab bar
    page.click(".mtab >> text=Brain")
    page.wait_for_selector(".brain-seg")
    assert page.get_attribute(".brain", "data-pane") == "list"
    assert page.is_visible(".brain-left"), "notes list must be reachable on a phone"
    page.click(".brain-segbtn >> text=Graph")
    assert page.is_visible(".brain-mid")
    page.click(".mtab >> text=Control")
    page.wait_for_timeout(800)
    assert page.evaluate("document.documentElement.scrollWidth") <= width
    assert not errors, errors
    ctx.close()


def test_tablet_opens_details_as_side_sheet_and_desktop_has_no_tab_bar(browser, base):
    ctx, page, errors = open_app(browser, base, 768, 1024)
    assert not page.is_visible(".mtabs")
    page.click("button[aria-label='Toggle agent details']")
    assert page.is_visible(".agx-panel")
    ctx.close()
    for width in (1024, 1366, 1920):
        ctx, page, errors = open_app(browser, base, width, 900, touch=False)
        assert not page.is_visible(".mtabs"), width
        assert page.is_visible(".side"), width
        assert page.evaluate("document.documentElement.scrollWidth") <= width, width
        assert not errors, errors
        ctx.close()
