from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.client import get_client_ip
from app.core.config import settings
from app.core.exceptions import rate_limit_error_handler
from app.core.security import TokenError, TokenType, decode_token

AUTH_LIMIT = f"{settings.RATE_LIMIT_AUTH_PER_MINUTE}/minute"
MEDIA_LIMIT = f"{settings.RATE_LIMIT_MEDIA_PER_MINUTE}/minute"


def rate_limit_key(request: Request) -> str:
    """Key requests by user id when a valid access JWT is present, otherwise by client IP.

    Only the JWT signature is checked here (no session lookup) to keep the limiter cheap.
    """
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token:
        try:
            claims = decode_token(token, TokenType.ACCESS)
        except TokenError:
            pass
        else:
            return f"user:{claims['sub']}"
    return f"ip:{get_client_ip(request)}"


limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=[f"{settings.RATE_LIMIT_PER_SECOND}/second"],
    storage_uri=settings.REDIS_URL,
    enabled=settings.RATE_LIMIT_ENABLED,
    key_prefix="ratelimit",
    in_memory_fallback_enabled=True,
)


def _global_bucket() -> None:
    """Marker endpoint: every HTTP request of a client shares one default-limit bucket."""


class RateLimitMiddleware:
    """Pure ASGI middleware applying the default slowapi limit to every HTTP request.

    slowapi's own middleware resolves endpoints via `app.routes`, which no longer exposes
    routes of included routers in recent FastAPI versions, so it would silently skip them.
    WebSocket traffic passes through untouched; it is limited per connection in `realtime`.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not limiter.enabled:
            await self.app(scope, receive, send)
            return
        request = Request(scope, receive)
        try:
            limiter._check_request_limit(request, _global_bucket, True)
        except RateLimitExceeded as exc:
            response = await rate_limit_error_handler(request, exc)
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)
