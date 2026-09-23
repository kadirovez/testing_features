from starlette.requests import HTTPConnection

from app.core.config import settings

USER_AGENT_MAX_LENGTH = 255


def get_client_ip(connection: HTTPConnection) -> str:
    """Resolve the client IP, trusting `X-Forwarded-For` only from configured proxies."""
    peer_ip = connection.client.host if connection.client else "unknown"
    if peer_ip not in settings.TRUSTED_PROXIES:
        return peer_ip
    forwarded_for = connection.headers.get("x-forwarded-for")
    if not forwarded_for:
        return peer_ip
    return forwarded_for.split(",")[0].strip()


def get_user_agent(connection: HTTPConnection) -> str:
    """Return the (truncated) User-Agent header or an empty string."""
    return connection.headers.get("user-agent", "")[:USER_AGENT_MAX_LENGTH]
