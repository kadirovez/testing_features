from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _to_asyncpg_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgresql://")
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgres://")
    return url


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and `.env`."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "messenger"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://messenger:messenger@localhost:5432/messenger"
    DATABASE_ECHO: bool = False

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 30

    CORS_ORIGINS: list[str] = []
    TRUSTED_PROXIES: list[str] = []

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_SECOND: int = 10
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_MEDIA_PER_MINUTE: int = 30
    RATE_LIMIT_WS_EVENTS_PER_SECOND: int = 20

    PAGINATION_DEFAULT_LIMIT: int = 50
    PAGINATION_MAX_LIMIT: int = 100

    MESSAGE_MAX_LENGTH: int = 4096
    MESSAGE_MAX_ATTACHMENTS: int = 10

    THEME_MAX_BYTES: int = 16384
    THEME_MAX_DEPTH: int = 5

    PRESENCE_TTL_SECONDS: int = 60
    TYPING_TTL_SECONDS: int = 5

    S3_ENDPOINT_URL: str | None = None
    S3_PUBLIC_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str = "messenger-media"
    S3_PRESIGNED_UPLOAD_TTL_SECONDS: int = 900
    S3_PRESIGNED_DOWNLOAD_TTL_SECONDS: int = 3600

    MEDIA_MAX_PHOTO_BYTES: int = 20 * 1024 * 1024
    MEDIA_MAX_VIDEO_BYTES: int = 500 * 1024 * 1024
    MEDIA_ALLOWED_PHOTO_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    MEDIA_ALLOWED_VIDEO_TYPES: list[str] = ["video/mp4", "video/quicktime", "video/webm"]
    MEDIA_THUMBNAIL_SIZE: int = 320
    MEDIA_STALE_UPLOAD_HOURS: int = 24
    FFMPEG_BINARY: str = "ffmpeg"
    FFPROBE_BINARY: str = "ffprobe"

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if isinstance(value, str):
            return _to_asyncpg_url(value)
        return value


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings instance."""
    return Settings()


settings = get_settings()
