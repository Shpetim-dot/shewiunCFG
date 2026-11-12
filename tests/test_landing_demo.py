"""Real-browser regression coverage for the public, read-only product preview.

Uses system Chromium when available, otherwise Playwright's managed browser.
Run with the same database isolation settings as the rest of the test suite.
"""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.request

import pytest

pw = pytest.importorskip("playwright.sync_api")
ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def landing_server(tmp_path_factory):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    directory = tmp_path_factory.mktemp("landing-demo")
    env = dict(os.environ, CFA_DATABASE_PATH=str(directory / "landing.db"))
    for name in ("CFA_ENV", "CFA_API_KEYS"):
        env.pop(name, None)
    with (directory / "server.log").open("w+") as log:
        server = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
            cwd=ROOT, env=env, stdout=log, stderr=log,
        )
        base = f"http://127.0.0.1:{port}"
        try:
            for _ in range(80):
                if server.poll() is not None:
                    log.seek(0)
                    pytest.fail("Landing test server exited: " + log.read())
                try:
                    with urllib.request.urlopen(base + "/", timeout=2) as response:
                        assert response.status == 200
                    break
                except OSError:
                    time.sleep(0.25)
            else:
                pytest.fail("Landing test server did not become ready")
            yield base
        finally:
            server.terminate()
            server.wait(timeout=10)


@pytest.fixture(scope="module")
def demo_browser():
    with pw.sync_playwright() as playwright:
        executable = shutil.which("chromium") or shutil.which("chromium-browser")
        try:
            browser = playwright.chromium.launch(**({"executable_path": executable} if executable else {}))
        except pw.Error as error:
            if executable:
                raise
            pytest.skip(f"Chromium unavailable: {error}")
        yield browser
        browser.close()


@pytest.mark.parametrize("width", [360, 390, 430, 768, 1024, 1366, 1920])
def test_demo_switching_keyboard_scroll_and_no_writes(demo_browser, landing_server, width):
    context = demo_browser.new_context(viewport={"width": width, "height": 900}, color_scheme="light")
    context.add_init_script("localStorage.setItem('shewiun_consent_v1', 'essential')")
    page = context.new_page()
    writes, errors = [], []
    page.on("request", lambda request: writes.append(request.url) if request.method != "GET" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(landing_server)
    page.locator("#demo-tab-researcher").click()
    assert page.locator("#demo-agent-name").inner_text() == "Researcher"
    messages = page.locator("#demo-chat-scroll")
    assert messages.evaluate("el => el.scrollHeight > el.clientHeight")
    messages.evaluate("el => el.scrollTop = 120")
    page.locator("#demo-tab-builder").click()
    assert "No websites were fetched" not in messages.inner_text()
    page.locator("#demo-tab-researcher").click()
    assert messages.evaluate("el => el.scrollTop") == 120
    page.locator("#demo-tab-researcher").press("End")
    assert page.locator("#demo-tab-builder").get_attribute("aria-selected") == "true"
    page.locator("#demo-tab-builder").press("ArrowDown")
    assert page.locator("#demo-tab-strategist").get_attribute("aria-selected") == "true"
    page.locator("#tab-council").focus()
    page.locator("#tab-council").press("ArrowLeft")
    assert page.locator("#p-org").is_visible()
    assert page.locator("#demo-tab-strategist").get_attribute("aria-selected") == "true"
    assert page.locator("#workspace-preview textarea, #workspace-preview input").count() == 0
    assert page.evaluate("document.documentElement.scrollWidth") <= width
    if width <= 760:
        page.locator(".menu-btn").click()
        assert page.locator(".menu-btn").get_attribute("aria-expanded") == "true"
        page.locator("#nav a[href='#features']").click()
        assert page.locator(".menu-btn").get_attribute("aria-expanded") == "false"
    assert not writes, writes
    assert not errors, errors
    context.close()


def test_landing_content_is_readable_without_javascript(demo_browser, landing_server):
    context = demo_browser.new_context(java_script_enabled=False)
    page = context.new_page()
    page.goto(landing_server)
    assert "Work you can stand behind" in page.locator("h1").inner_text()
    assert "Northstar Studio" in page.locator("#demo-chat-scroll").inner_text()
    assert page.locator("#p-council").is_visible()
    assert page.locator("#p-control").is_visible()
    context.close()
