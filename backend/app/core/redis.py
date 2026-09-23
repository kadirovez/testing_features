from redis.asyncio import Redis, from_url

from app.core.config import settings

redis_client: Redis = from_url(settings.REDIS_URL, decode_responses=True)


def get_redis() -> Redis:
    """Return the shared Redis client."""
    return redis_client


async def close_redis() -> None:
    """Close the shared Redis connection pool."""
    await redis_client.aclose()
