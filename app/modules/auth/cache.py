import logging
from datetime import UTC, datetime
from uuid import UUID

from redis.exceptions import RedisError

from app.core.redis import get_redis
from app.modules.auth.schemas import CachedSession

logger = logging.getLogger(__name__)


def _key(session_id: UUID) -> str:
    return f"session:{session_id}"


async def get_cached_session(session_id: UUID) -> CachedSession | None:
    """Read session state from Redis; a Redis failure is treated as a cache miss."""
    try:
        data = await get_redis().hgetall(_key(session_id))
    except RedisError:
        logger.warning("Redis unavailable while reading session %s", session_id)
        return None
    if not data:
        return None
    return CachedSession(
        user_id=UUID(data["user_id"]),
        refresh_token_hash=data["refresh_token_hash"],
        revoked=data["revoked"] == "1",
        expires_at=datetime.fromisoformat(data["expires_at"]),
    )


async def set_cached_session(session_id: UUID, state: CachedSession) -> None:
    """Write session state to Redis with a TTL matching the session lifetime."""
    ttl_seconds = max(int((state.expires_at - datetime.now(UTC)).total_seconds()), 1)
    mapping = {
        "user_id": str(state.user_id),
        "refresh_token_hash": state.refresh_token_hash,
        "revoked": "1" if state.revoked else "0",
        "expires_at": state.expires_at.isoformat(),
    }
    try:
        async with get_redis().pipeline(transaction=True) as pipe:
            pipe.hset(_key(session_id), mapping=mapping)
            pipe.expire(_key(session_id), ttl_seconds)
            await pipe.execute()
    except RedisError:
        logger.warning("Redis unavailable while caching session %s", session_id)
