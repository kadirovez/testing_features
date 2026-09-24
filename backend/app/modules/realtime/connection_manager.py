import time
from collections import defaultdict
from dataclasses import dataclass, field
from uuid import UUID, uuid4

from fastapi import WebSocket

from app.core.config import settings


@dataclass(eq=False)
class Connection:
    """A live WebSocket connection handled by this instance."""

    websocket: WebSocket
    user_id: UUID
    session_id: UUID
    locale: str
    id: UUID = field(default_factory=uuid4)
    _tokens: float = field(default=float(settings.RATE_LIMIT_WS_EVENTS_PER_SECOND))
    _last_refill: float = field(default_factory=time.monotonic)

    def allow_event(self) -> bool:
        """Token-bucket limiter for incoming events on this connection."""
        rate = float(settings.RATE_LIMIT_WS_EVENTS_PER_SECOND)
        now = time.monotonic()
        self._tokens = min(rate, self._tokens + (now - self._last_refill) * rate)
        self._last_refill = now
        if self._tokens < 1:
            return False
        self._tokens -= 1
        return True


class ConnectionManager:
    """In-memory registry of connections on this instance, indexed by user and session."""

    def __init__(self) -> None:
        self._by_user: dict[UUID, set[Connection]] = defaultdict(set)
        self._by_session: dict[UUID, set[Connection]] = defaultdict(set)

    def add(self, connection: Connection) -> bool:
        """Register a connection; returns True if it is the user's first one on this instance."""
        first = not self._by_user.get(connection.user_id)
        self._by_user[connection.user_id].add(connection)
        self._by_session[connection.session_id].add(connection)
        return first

    def remove(self, connection: Connection) -> bool:
        """Unregister a connection; returns True if it was the user's last one on this instance."""
        user_connections = self._by_user.get(connection.user_id, set())
        user_connections.discard(connection)
        session_connections = self._by_session.get(connection.session_id, set())
        session_connections.discard(connection)
        if not session_connections:
            self._by_session.pop(connection.session_id, None)
        if not user_connections:
            self._by_user.pop(connection.user_id, None)
            return True
        return False

    def for_user(self, user_id: UUID) -> list[Connection]:
        return list(self._by_user.get(user_id, ()))

    def for_session(self, session_id: UUID) -> list[Connection]:
        return list(self._by_session.get(session_id, ()))

    def user_ids(self) -> list[UUID]:
        return list(self._by_user)


manager = ConnectionManager()
