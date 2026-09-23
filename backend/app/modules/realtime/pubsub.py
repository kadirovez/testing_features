import asyncio
import contextlib
import logging
from uuid import UUID

from redis.asyncio.client import PubSub
from redis.exceptions import RedisError

from app.core.redis import get_redis

logger = logging.getLogger(__name__)

SESSION_REVOKED_CHANNEL = "rt:session_revoked"
USER_CHANNEL_PREFIX = "rt:user:"
_RECONNECT_DELAY_SECONDS = 1.0


def user_channel(user_id: UUID) -> str:
    return f"{USER_CHANNEL_PREFIX}{user_id}"


class PubSubListener:
    """Per-instance Redis subscriber that routes cross-instance events to local connections."""

    def __init__(self) -> None:
        self._pubsub: PubSub | None = None
        self._task: asyncio.Task[None] | None = None
        self._channels: set[str] = {SESSION_REVOKED_CHANNEL}

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="realtime-pubsub")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        if self._pubsub is not None:
            await self._pubsub.aclose()

    async def subscribe_user(self, user_id: UUID) -> None:
        self._channels.add(user_channel(user_id))
        if self._pubsub is not None:
            await self._pubsub.subscribe(user_channel(user_id))

    async def unsubscribe_user(self, user_id: UUID) -> None:
        self._channels.discard(user_channel(user_id))
        if self._pubsub is not None:
            await self._pubsub.unsubscribe(user_channel(user_id))

    async def _run(self) -> None:
        from app.modules.realtime import service as realtime_service

        while True:
            try:
                self._pubsub = get_redis().pubsub(ignore_subscribe_messages=True)
                await self._pubsub.subscribe(*self._channels)
                while True:
                    message = await self._pubsub.get_message(timeout=1.0)
                    if message is None:
                        continue
                    channel: str = message["channel"]
                    data: str = message["data"]
                    if channel == SESSION_REVOKED_CHANNEL:
                        await realtime_service.handle_session_revoked(UUID(data))
                    elif channel.startswith(USER_CHANNEL_PREFIX):
                        await realtime_service.deliver_local(UUID(channel.removeprefix(USER_CHANNEL_PREFIX)), data)
            except RedisError:
                logger.warning("Redis pub/sub connection lost, reconnecting")
                if self._pubsub is not None:
                    with contextlib.suppress(RedisError):
                        await self._pubsub.aclose()
                self._pubsub = None
                await asyncio.sleep(_RECONNECT_DELAY_SECONDS)


listener = PubSubListener()
