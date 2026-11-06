"""Entrypoint for serverless hosts (Vercel) and local runs.

Vercel auto-detects main.py/app.py/index.py at the repository root and sends *every* path to
it, so the FastAPI app receives the real URL (no rewrite needed). The application lives in the
`app/` package, which may sit next to this file, one level up, or be uploaded flat (modules next
to this file). All three layouts work; if the code is missing we answer with a readable 503.
"""
from __future__ import annotations

import sys
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEARCH = [HERE, HERE.parent, Path.cwd()]


def _find_layout() -> tuple[Path | None, str | None]:
    for base in SEARCH:
        if (base / "app" / "main.py").is_file():
            return base, "package"
    for base in SEARCH:
        if (base / "cfa_core.py").is_file() and (base / "main.py").is_file() and base != HERE:
            return base, "flat"
    if (HERE / "cfa_core.py").is_file():
        return HERE, "flat"
    return None, None


ROOT, LAYOUT = _find_layout()


def _fallback(reason: str):
    body = ('{"status":"error","detail":"' + reason.replace('"', "'") +
            '","fix":"deploy the whole repository including the app/ folder"}').encode()

    async def app(scope, receive, send):
        if scope["type"] != "http":
            return
        await send({"type": "http.response.start", "status": 503,
                    "headers": [(b"content-type", b"application/json"),
                                (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})

    return app


if ROOT is None:
    app = _fallback("the application package was not found next to the entrypoint")
else:
    sys.path.insert(0, str(ROOT))
    pkg_dir = ROOT / "app" if LAYOUT == "package" else ROOT
    if "app" not in sys.modules:
        pkg = types.ModuleType("app")
        pkg.__path__ = [str(pkg_dir)]
        pkg.__file__ = str(pkg_dir / "__init__.py")
        sys.modules["app"] = pkg
    from app.main import app  # noqa: E402,F401
    from app.main import STATIC  # noqa: E402  (kept importable for hosts that inspect it)

__all__ = ["app"]