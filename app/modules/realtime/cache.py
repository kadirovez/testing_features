from uuid import UUID

from app.core.config import settings
from app.core.redis import get_redis


def _key(user_id: UUID) -> str:
    return f"presence:{user_id}"


async def add_connection(user_id: UUID, connection_id: UUID) -> int:
    """Register a live connection of a user; returns the number of live connections."""
    async with get_redis().pipeline(transaction=True) as pipe:
        pipe.sadd(_key(user_id), str(connection_id))
        pipe.expire(_key(user_id), settings.PRESENCE_TTL_SECONDS)
        pipe.scard(_key(user_id))
        _, _, count = await pipe.execute()
    return int(count)


async def remove_connection(user_id: UUID, connection_id: UUID) -> int:
    """Unregister a connection; returns the number of remaining live connections."""
    async with get_redis().pipeline(transaction=True) as pipe:
        pipe.srem(_key(user_id), str(connection_id))
        pipe.scard(_key(user_id))
        _, count = await pipe.execute()
    return int(count)


async def refresh(user_id: UUID) -> None:
    """Extend the presence TTL (heartbeat)."""
    await get_redis().expire(_key(user_id), settings.PRESENCE_TTL_SECONDS)
