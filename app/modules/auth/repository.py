from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import Session


async def create_session(db: AsyncSession, **values: Any) -> Session:
    """Insert a new session row."""
    session = Session(**values)
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def get_session_by_id(db: AsyncSession, session_id: UUID) -> Session | None:
    """Fetch a session by id."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    return result.scalar_one_or_none()


async def rotate_refresh_hash(
    db: AsyncSession,
    session_id: UUID,
    old_hash: str,
    new_hash: str,
    last_active_at: datetime,
    expires_at: datetime,
    ip_address: str,
) -> Session | None:
    """Atomically swap the refresh hash if it still matches `old_hash` and the session is active."""
    result = await db.execute(
        update(Session)
        .where(
            Session.id == session_id,
            Session.refresh_token_hash == old_hash,
            Session.revoked_at.is_(None),
        )
        .values(
            refresh_token_hash=new_hash,
            last_active_at=last_active_at,
            expires_at=expires_at,
            ip_address=ip_address,
        )
        .returning(Session)
        .execution_options(synchronize_session=False, populate_existing=True)
    )
    return result.scalar_one_or_none()


async def set_session_revoked(db: AsyncSession, session_id: UUID, revoked_at: datetime) -> Session | None:
    """Mark an active session as revoked; returns None if it was missing or already revoked."""
    result = await db.execute(
        update(Session)
        .where(Session.id == session_id, Session.revoked_at.is_(None))
        .values(revoked_at=revoked_at)
        .returning(Session)
        .execution_options(synchronize_session=False, populate_existing=True)
    )
    return result.scalar_one_or_none()


async def list_active_sessions_by_user(db: AsyncSession, user_id: UUID, now: datetime) -> list[Session]:
    """List non-revoked, non-expired sessions of a user, most recently active first."""
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user_id, Session.revoked_at.is_(None), Session.expires_at > now)
        .order_by(Session.last_active_at.desc())
    )
    return list(result.scalars())
