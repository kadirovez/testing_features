import os
from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine.url import make_url


def _to_asyncpg_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgresql://")
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgres://")
    return url


def _database_url_from_pg_env() -> str | None:
    host = os.environ.get("PGHOST") or os.environ.get("POSTGRES_HOST")
    user = os.environ.get("PGUSER") or os.environ.get("POSTGRES_USER")
    password = os.environ.get("PGPASSWORD") or os.environ.get("POSTGRES_PASSWORD")
    database = os.environ.get("PGDATABASE") or os.environ.get("POSTGRES_DB")
    port = os.environ.get("PGPORT") or os.environ.get("POSTGRES_PORT") or "5432"
    if not all([host, user, password, database]):
        return None
    return (
        f"postgresql+asyncpg://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(database)}"
    )


LOCAL_DATABASE_URL = "postgresql+asyncpg://messenger:messenger@localhost:5432/messenger"


def _sanitize_url_string(raw: str) -> str:
    return raw.strip().strip('"').strip("'").replace("\n", "").replace("\r", "")


def _try_postgres_url(raw: str) -> str | None:
    cleaned = _sanitize_url_string(raw)
    if not cleaned or "${{" in cleaned or "{{" in cleaned:
        return None
    coerced = _to_asyncpg_url(cleaned)
    if not coerced.startswith("postgresql+asyncpg://"):
        return None
    try:
        make_url(coerced)
    except Exception:
        return None
    return coerced


def _coerce_database_url(value: object) -> str:
    candidates: list[str] = []
    for key in ("DATABASE_PRIVATE_URL", "DATABASE_URL", "DATABASE_PUBLIC_URL"):
        env_val = os.environ.get(key, "").strip()
        if env_val:
            candidates.append(env_val)
    if isinstance(value, str):
        stripped = _sanitize_url_string(value)
        if stripped and stripped not in candidates and stripped != LOCAL_DATABASE_URL:
            candidates.append(stripped)

    for raw in candidates:
        parsed = _try_postgres_url(raw)
        if parsed is not None:
            return parsed

    built = _database_url_from_pg_env()
    if built is not None:
        parsed = _try_postgres_url(built)
        if parsed is not None:
            return parsed

    on_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PROJECT_ID"))
    if any("${{" in item or "{{" in item for item in candidates):
        raise ValueError(
            "DATABASE_URL contains an unresolved Railway reference. "
            "api → Variables → Add Variable Reference → Postgres → DATABASE_URL "
            "(or Connect Postgres to this service)."
        )
    if on_railway:
        raise ValueError(
            "DATABASE_URL is missing or invalid on Railway. "
            "Connect the Postgres plugin to the api service, then add a DATABASE_URL "
            "variable reference from Postgres."
        )

    raise ValueError(
        "DATABASE_URL is missing or not a valid Postgres URL. "
        "Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE."
    )


LOCAL_REDIS_URL = "redis://localhost:6379/0"


def _try_redis_url(raw: str) -> str | None:
    cleaned = _sanitize_url_string(raw)
    if not cleaned or "{{" in cleaned:
        return None
    if cleaned.startswith(("redis://", "rediss://", "unix://")):
        return cleaned
    return None


def _with_redis_db(url: str, db: int) -> str:
    if url.startswith("unix://"):
        return url
    scheme, rest = url.split("://", 1)
    authority = rest.rsplit("/", 1)[0] if "/" in rest else rest
    return f"{scheme}://{authority}/{db}"


def _redis_url_from_env(db: int) -> str | None:
    host = os.environ.get("REDISHOST") or os.environ.get("REDIS_HOST")
    port = os.environ.get("REDISPORT") or os.environ.get("REDIS_PORT") or "6379"
    password = os.environ.get("REDISPASSWORD") or os.environ.get("REDIS_PASSWORD")
    user = os.environ.get("REDISUSER") or os.environ.get("REDIS_USER") or "default"
    if not host:
        return None
    if password:
        return f"redis://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{db}"
    return f"redis://{host}:{port}/{db}"


def _resolve_base_redis_url() -> str:
    candidates: list[str] = []
    for key in ("REDIS_PRIVATE_URL", "REDIS_URL", "REDIS_PUBLIC_URL"):
        env_val = os.environ.get(key, "").strip()
        if env_val:
            candidates.append(env_val)

    for raw in candidates:
        parsed = _try_redis_url(raw)
        if parsed is not None:
            return parsed

    built = _redis_url_from_env(0)
    if built is not None:
        return built

    on_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PROJECT_ID"))
    if any("{{" in item for item in candidates):
        raise ValueError(
            "REDIS_URL contains an unresolved Railway reference. "
            "api → Variables → Add Variable Reference → Redis → REDIS_URL "
            "(or Connect Redis to this service)."
        )
    if on_railway:
        raise ValueError(
            "REDIS_URL is missing or invalid on Railway. "
            "Connect the Redis plugin to the api service, then add a REDIS_URL reference."
        )

    raise ValueError(
        "REDIS_URL is missing or invalid. Set REDIS_URL or REDISHOST/REDISPORT/REDISPASSWORD."
    )


def _coerce_redis_url(value: object, db: int) -> str:
    local_default = f"redis://localhost:6379/{db}"
    if isinstance(value, str):
        stripped = _sanitize_url_string(value)
        if stripped and stripped != local_default and "{{" not in stripped:
            parsed = _try_redis_url(stripped)
            if parsed is not None:
                return parsed

    base = _resolve_base_redis_url()
    return _with_redis_db(base, db)


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
        return _coerce_database_url(value)

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def normalize_redis_url(cls, value: object) -> object:
        return _coerce_redis_url(value, 0)

    @field_validator("CELERY_BROKER_URL", mode="before")
    @classmethod
    def normalize_celery_broker_url(cls, value: object) -> object:
        return _coerce_redis_url(value, 1)

    @field_validator("CELERY_RESULT_BACKEND", mode="before")
    @classmethod
    def normalize_celery_result_backend(cls, value: object) -> object:
        return _coerce_redis_url(value, 2)

    @model_validator(mode="after")
    def validate_runtime_secrets(self) -> "Settings":
        if len(self.JWT_SECRET) < 32:
            msg = (
                "JWT_SECRET must be at least 32 characters. "
                "On Railway: api service → Variables → JWT_SECRET (e.g. openssl rand -hex 32)."
            )
            raise ValueError(msg)

        on_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PROJECT_ID"))
        if on_railway and self.DATABASE_URL == LOCAL_DATABASE_URL:
            raise ValueError(
                "DATABASE_URL still points to localhost on Railway. "
                "Connect Postgres to the api service and add a DATABASE_URL reference."
            )
        try:
            make_url(self.DATABASE_URL)
        except Exception as exc:
            raise ValueError(f"DATABASE_URL is not a valid SQLAlchemy URL: {exc}") from exc

        for name, url in (
            ("REDIS_URL", self.REDIS_URL),
            ("CELERY_BROKER_URL", self.CELERY_BROKER_URL),
            ("CELERY_RESULT_BACKEND", self.CELERY_RESULT_BACKEND),
        ):
            if not _try_redis_url(url):
                raise ValueError(f"{name} is not a valid Redis URL.")

        if on_railway and self.REDIS_URL == LOCAL_REDIS_URL:
            raise ValueError(
                "REDIS_URL still points to localhost on Railway. "
                "Connect Redis to the api service and add a REDIS_URL reference."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings instance."""
    return Settings()


settings = get_settings()
