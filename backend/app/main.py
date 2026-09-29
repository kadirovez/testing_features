import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import storage
from app.core.config import settings
from app.core.database import SessionFactory, engine
from app.core.frontend_static import api_route_prefix, mount_frontend
from app.core.exceptions import register_exception_handlers
from app.core.i18n.middleware import LocaleMiddleware
from app.core.logging import RequestIdMiddleware, configure_logging
from app.core.rate_limit import RateLimitMiddleware, limiter
from app.core.redis import close_redis
from app.modules.auth.router import router as auth_router
from app.modules.chats.router import router as chats_router
from app.modules.media.router import router as media_router
from app.modules.messages.router import router as messages_router
from app.modules.realtime.pubsub import listener
from app.modules.realtime.router import router as realtime_router
from app.modules.settings.router import router as settings_router
from app.modules.users import service as users_service
from app.modules.users.router import router as users_router


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    try:
        await storage.ensure_bucket()
    except (BotoCoreError, ClientError):
        # Object storage being down must not prevent the API from serving non-media traffic.
        logger.warning("Could not ensure S3 bucket %s exists", settings.S3_BUCKET)
    async with SessionFactory() as db:
        await users_service.ensure_system_accounts(db)
        await db.commit()
    await listener.start()
    yield
    await listener.stop()
    await close_redis()
    await engine.dispose()


def create_app() -> FastAPI:
    """Build the FastAPI application with middleware, handlers and module routers."""
    configure_logging()
    app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)
    app.state.limiter = limiter

    # Starlette runs the last added middleware first: locale must be resolved before rate limiting.
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(LocaleMiddleware)
    app.add_middleware(RequestIdMiddleware)
    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    register_exception_handlers(app)

    api_prefix = api_route_prefix()
    app.include_router(auth_router, prefix=api_prefix)
    app.include_router(users_router, prefix=api_prefix)
    app.include_router(settings_router, prefix=api_prefix)
    app.include_router(chats_router, prefix=api_prefix)
    app.include_router(messages_router, prefix=api_prefix)
    app.include_router(media_router, prefix=api_prefix)
    app.include_router(realtime_router)

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    mount_frontend(app)

    return app


app = create_app()
