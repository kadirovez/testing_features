from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI

STATIC_ROOT = Path(__file__).resolve().parent.parent.parent / "static"


def api_route_prefix() -> str:
    """Use /api when the production SPA bundle is baked into the image (Railway single service)."""
    if STATIC_ROOT.joinpath("index.html").is_file():
        return "/api"
    return ""


def mount_frontend(app: "FastAPI") -> None:
    """Serve the Vite build and SPA fallback from `/` when `static/` exists."""
    if not STATIC_ROOT.joinpath("index.html").is_file():
        return
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=STATIC_ROOT, html=True), name="frontend")
