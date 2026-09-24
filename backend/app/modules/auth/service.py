from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.i18n.types import ErrorDefinition
from app.core.security import (
    TokenExpiredError,
    TokenInvalidError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.modules.auth import cache as session_cache
from app.modules.auth import repository as auth_repo
from app.modules.auth.models import Session
from app.modules.auth.schemas import (
    CachedSession,
    CurrentSession,
    DeviceInfo,
    LoginRequest,
    RegisterRequest,
    SessionRead,
    TokenPair,
)
from app.modules.realtime import service as realtime_service
from app.modules.onboarding import service as onboarding_service
from app.modules.users import service as users_service
from app.modules.users.schemas import UserCreate
from app.seed.errors.auth import (
    ACCESS_TOKEN_EXPIRED,
    ACCESS_TOKEN_INVALID,
    AUTH_HEADER_MISSING,
    INVALID_CREDENTIALS,
    REFRESH_TOKEN_EXPIRED,
    REFRESH_TOKEN_INVALID,
    REFRESH_TOKEN_MISMATCH,
    SESSION_EXPIRED,
    SESSION_NOT_FOUND,
    SESSION_REVOKED,
    USER_INACTIVE,
)

# Verified against when the email is unknown so login timing does not reveal registered emails.
_DUMMY_PASSWORD_HASH = hash_password(uuid4().hex)


def _now() -> datetime:
    return datetime.now(UTC)


def _state_from_session(session: Session) -> CachedSession:
    return CachedSession(
        user_id=session.user_id,
        refresh_token_hash=session.refresh_token_hash,
        revoked=session.revoked_at is not None,
        expires_at=session.expires_at,
    )


def _decode(
    token: str, token_type: TokenType, expired_error: ErrorDefinition, invalid_error: ErrorDefinition
) -> dict[str, Any]:
    try:
        return decode_token(token, token_type)
    except TokenExpiredError:
        raise AppError(expired_error) from None
    except TokenInvalidError:
        raise AppError(invalid_error) from None


def _build_token_pair(user_id: UUID, session_id: UUID, refresh_token: str) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user_id, session_id),
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_TTL_MINUTES * 60,
        session_id=session_id,
    )


async def _load_session_state(db: AsyncSession, session_id: UUID) -> CachedSession | None:
    """Read session state from Redis, falling back to Postgres and warming the cache."""
    cached = await session_cache.get_cached_session(session_id)
    if cached is not None:
        return cached
    session = await auth_repo.get_session_by_id(db, session_id)
    if session is None:
        return None
    state = _state_from_session(session)
    await session_cache.set_cached_session(session_id, state)
    return state


async def create_session(db: AsyncSession, user_id: UUID, device: DeviceInfo) -> TokenPair:
    """Open a new independent session for a user and issue its first token pair."""
    now = _now()
    session_id = uuid4()
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    refresh_token = create_refresh_token(session_id, expires_at)
    session = await auth_repo.create_session(
        db,
        id=session_id,
        user_id=user_id,
        device_name=device.device_name,
        ip_address=device.ip_address,
        refresh_token_hash=hash_token(refresh_token),
        last_active_at=now,
        expires_at=expires_at,
    )
    await db.commit()
    await session_cache.set_cached_session(session_id, _state_from_session(session))
    return _build_token_pair(user_id, session_id, refresh_token)


async def register_user(
    db: AsyncSession, data: RegisterRequest, device: DeviceInfo, locale: str
) -> TokenPair:
    """Register a new user and sign them in on the current device."""
    user = await users_service.create_user(
        db,
        UserCreate(
            email=data.email,
            username=data.username,
            password_hash=hash_password(data.password),
            display_name=data.display_name,
        ),
    )
    await onboarding_service.setup_for_new_user(db, user.id, locale)
    return await create_session(db, user.id, device)


async def login(db: AsyncSession, data: LoginRequest, device: DeviceInfo) -> TokenPair:
    """Verify credentials and open a new session without touching other sessions."""
    credentials = await users_service.get_user_credentials_by_email(db, data.email)
    password_hash = credentials.password_hash if credentials is not None else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(data.password, password_hash)
    # unknown email or wrong password
    if credentials is None or not password_ok:
        raise AppError(INVALID_CREDENTIALS)

    # account is deactivated
    if not credentials.is_active:
        raise AppError(USER_INACTIVE)

    # built-in bot accounts cannot sign in
    if credentials.is_system:
        raise AppError(INVALID_CREDENTIALS)

    return await create_session(db, credentials.id, device)


async def rotate_session_tokens(db: AsyncSession, refresh_token: str, device: DeviceInfo) -> TokenPair:
    """Exchange a refresh token for a new token pair of the same session (token rotation)."""
    claims = _decode(refresh_token, TokenType.REFRESH, REFRESH_TOKEN_EXPIRED, REFRESH_TOKEN_INVALID)
    session_id = UUID(claims["sid"])
    now = _now()
    state = await _load_session_state(db, session_id)
    # token references a session that does not exist
    if state is None:
        raise AppError(REFRESH_TOKEN_INVALID)

    # session was logged out locally or remotely
    if state.revoked:
        raise AppError(SESSION_REVOKED)

    # session lifetime is over
    if state.expires_at <= now:
        raise AppError(SESSION_EXPIRED)

    old_hash = hash_token(refresh_token)
    # an already rotated token is being reused: treat the session as compromised
    if state.refresh_token_hash != old_hash:
        await revoke_session(db, session_id)
        raise AppError(REFRESH_TOKEN_MISMATCH)

    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    new_refresh_token = create_refresh_token(session_id, expires_at)
    session = await auth_repo.rotate_refresh_hash(
        db, session_id, old_hash, hash_token(new_refresh_token), now, expires_at, device.ip_address
    )
    # a concurrent request rotated or revoked the session first
    if session is None:
        await db.rollback()
        await revoke_session(db, session_id)
        raise AppError(REFRESH_TOKEN_MISMATCH)

    await db.commit()
    await session_cache.set_cached_session(session_id, _state_from_session(session))
    return _build_token_pair(session.user_id, session_id, new_refresh_token)


async def revoke_session(db: AsyncSession, session_id: UUID) -> None:
    """Revoke a session in Postgres and Redis and disconnect its WebSocket connections."""
    session = await auth_repo.set_session_revoked(db, session_id, _now())
    await db.commit()
    if session is not None:
        await session_cache.set_cached_session(session_id, _state_from_session(session))
    await realtime_service.notify_session_revoked(session_id)


async def logout(db: AsyncSession, current: CurrentSession) -> None:
    """Log out the current session."""
    await revoke_session(db, current.session_id)


async def revoke_user_session(db: AsyncSession, actor_user_id: UUID, session_id: UUID) -> None:
    """Remotely log out one of the actor's own sessions."""
    session = await auth_repo.get_session_by_id(db, session_id)
    # session does not exist or belongs to another user (indistinguishable on purpose)
    if session is None or session.user_id != actor_user_id:
        raise AppError(SESSION_NOT_FOUND)

    # session is already revoked, so it is not in the active list anymore
    if session.revoked_at is not None:
        raise AppError(SESSION_NOT_FOUND)

    await revoke_session(db, session_id)


async def list_user_sessions(db: AsyncSession, user_id: UUID, current_session_id: UUID) -> list[SessionRead]:
    """List active sessions of a user, flagging the one making the request."""
    sessions = await auth_repo.list_active_sessions_by_user(db, user_id, _now())
    return [
        SessionRead.model_validate(session).model_copy(update={"is_current": session.id == current_session_id})
        for session in sessions
    ]


async def authenticate_access_token(db: AsyncSession, token: str | None) -> CurrentSession:
    """Validate an access token and the liveness of the session it belongs to."""
    # no bearer token supplied
    if not token:
        raise AppError(AUTH_HEADER_MISSING)

    claims = _decode(token, TokenType.ACCESS, ACCESS_TOKEN_EXPIRED, ACCESS_TOKEN_INVALID)
    session_id = UUID(claims["sid"])
    user_id = UUID(claims["sub"])
    state = await _load_session_state(db, session_id)
    # token references a session that does not exist
    if state is None:
        raise AppError(ACCESS_TOKEN_INVALID)

    # session was revoked after the token was issued
    if state.revoked:
        raise AppError(SESSION_REVOKED)

    # session lifetime is over
    if state.expires_at <= _now():
        raise AppError(SESSION_EXPIRED)

    # token subject does not own the session
    if state.user_id != user_id:
        raise AppError(ACCESS_TOKEN_INVALID)

    return CurrentSession(user_id=user_id, session_id=session_id)


async def is_session_active(db: AsyncSession, session_id: UUID) -> bool:
    """Cheap liveness check used by long-lived WebSocket connections."""
    state = await _load_session_state(db, session_id)
    return state is not None and not state.revoked and state.expires_at > _now()
