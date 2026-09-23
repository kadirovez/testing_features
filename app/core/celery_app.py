from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "messenger",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.modules.media.tasks"],
)
celery_app.conf.update(
    task_acks_late=True,
    task_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    beat_schedule={
        "cleanup-stale-uploads": {
            "task": "media.cleanup_stale_uploads",
            "schedule": 3600.0,
        },
    },
)
