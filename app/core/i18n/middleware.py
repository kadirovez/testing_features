from starlette.datastructures import Headers
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.i18n.locale import parse_accept_language


class LocaleMiddleware:
    """Pure ASGI middleware storing the negotiated locale in `scope["state"]["locale"]`.

    Implemented without `BaseHTTPMiddleware` so it also covers WebSocket connections.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket"):
            headers = Headers(scope=scope)
            scope.setdefault("state", {})["locale"] = parse_accept_language(headers.get("accept-language"))
        await self.app(scope, receive, send)
