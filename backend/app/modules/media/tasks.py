import asyncio
from collections.abc import Coroutine
from typing import Any
from uuid import UUID

from app.core.celery_app import celery_app

# One persistent event loop per worker process: async DB/Redis pools are bound to the loop
# that created their connections, so a fresh `asyncio.run()` per task would break them.
_loop: asyncio.AbstractEventLoop | None = None


def _run[T](coro: Coroutine[Any, Any, T]) -> T:
    global _loop
    if _loop is None or _loop.is_closed():
        _loop = asyncio.new_event_loop()
    return _loop.run_until_complete(coro)


@celery_app.task(name="media.generate_thumbnail", acks_late=True, max_retries=3)
def generate_thumbnail_task(media_id: str) -> None:
    """Generate metadata and thumbnail for an uploaded media file."""
    from app.modules.media import service as media_service

    _run(media_service.process_media(UUID(media_id)))


@celery_app.task(name="media.cleanup_stale_uploads")
def cleanup_stale_uploads_task() -> int:
    """Remove uploads that were never confirmed."""
    from app.modules.media import service as media_service

    return _run(media_service.cleanup_stale_uploads())
