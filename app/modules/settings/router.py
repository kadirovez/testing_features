from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_session
from app.modules.auth.schemas import CurrentSession
from app.modules.settings import service as settings_service
from app.modules.settings.schemas import SettingsRead, SettingsUpdate, ThemeUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentDep = Annotated[CurrentSession, Depends(get_current_session)]


@router.get("", response_model=SettingsRead)
async def get_settings(db: DbDep, current: CurrentDep) -> SettingsRead:
    return await settings_service.get_settings(db, current.user_id)


@router.patch("", response_model=SettingsRead)
async def update_settings(data: SettingsUpdate, db: DbDep, current: CurrentDep) -> SettingsRead:
    return await settings_service.update_app_settings(db, current.user_id, data)


@router.put("/theme", response_model=SettingsRead)
async def update_theme(data: ThemeUpdate, db: DbDep, current: CurrentDep) -> SettingsRead:
    return await settings_service.update_theme(db, current.user_id, data)
