from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth import service as auth_service
from app.modules.auth.schemas import CurrentSession

_bearer = HTTPBearer(auto_error=False)


async def get_current_session(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentSession:
    """Resolve the authenticated session from the `Authorization: Bearer` header."""
    token = credentials.credentials if credentials is not None else None
    return await auth_service.authenticate_access_token(db, token)
