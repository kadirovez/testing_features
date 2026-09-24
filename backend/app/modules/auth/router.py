from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.client import get_client_ip, get_user_agent
from app.core.database import get_db
from app.core.i18n.locale import get_locale
from app.core.rate_limit import AUTH_LIMIT, limiter
from app.modules.auth import service as auth_service
from app.modules.auth.dependencies import get_current_session
from app.modules.auth.schemas import (
    CurrentSession,
    DeviceInfo,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    SessionRead,
    TokenPair,
)

router = APIRouter(prefix="/auth", tags=["auth"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentDep = Annotated[CurrentSession, Depends(get_current_session)]


def _device(request: Request, device_name: str | None = None) -> DeviceInfo:
    return DeviceInfo(device_name=device_name or get_user_agent(request), ip_address=get_client_ip(request))


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_LIMIT)
async def register(request: Request, data: RegisterRequest, db: DbDep) -> TokenPair:
    return await auth_service.register_user(db, data, _device(request, data.device_name), get_locale(request))


@router.post("/login", response_model=TokenPair)
@limiter.limit(AUTH_LIMIT)
async def login(request: Request, data: LoginRequest, db: DbDep) -> TokenPair:
    return await auth_service.login(db, data, _device(request, data.device_name))


@router.post("/refresh", response_model=TokenPair)
@limiter.limit(AUTH_LIMIT)
async def refresh(request: Request, data: RefreshRequest, db: DbDep) -> TokenPair:
    return await auth_service.rotate_session_tokens(db, data.refresh_token, _device(request))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(db: DbDep, current: CurrentDep) -> None:
    await auth_service.logout(db, current)


@router.get("/sessions", response_model=list[SessionRead])
async def list_sessions(db: DbDep, current: CurrentDep) -> list[SessionRead]:
    return await auth_service.list_user_sessions(db, current.user_id, current.session_id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(session_id: UUID, db: DbDep, current: CurrentDep) -> None:
    await auth_service.revoke_user_session(db, current.user_id, session_id)
