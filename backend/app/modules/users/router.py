from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.pagination import Page
from app.modules.auth.dependencies import get_current_session
from app.modules.auth.schemas import CurrentSession
from app.modules.users import service as users_service
from app.modules.users.schemas import (
    AvatarUpdate,
    ContactCreate,
    ContactRead,
    UserPublicRead,
    UserRead,
    UserUpdate,
)

router = APIRouter(tags=["users"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentDep = Annotated[CurrentSession, Depends(get_current_session)]
LimitQuery = Annotated[int, Query(ge=1, le=settings.PAGINATION_MAX_LIMIT)]


@router.get("/users/me", response_model=UserRead)
async def get_me(db: DbDep, current: CurrentDep) -> UserRead:
    return await users_service.get_my_profile(db, current.user_id)


@router.patch("/users/me", response_model=UserRead)
async def update_me(data: UserUpdate, db: DbDep, current: CurrentDep) -> UserRead:
    return await users_service.update_profile(db, current.user_id, data)


@router.put("/users/me/avatar", response_model=UserRead)
async def set_avatar(data: AvatarUpdate, db: DbDep, current: CurrentDep) -> UserRead:
    return await users_service.set_avatar(db, current.user_id, data.media_id)


@router.delete("/users/me/avatar", response_model=UserRead)
async def remove_avatar(db: DbDep, current: CurrentDep) -> UserRead:
    return await users_service.remove_avatar(db, current.user_id)


@router.get("/users/search", response_model=Page[UserPublicRead])
async def search_users(
    db: DbDep,
    current: CurrentDep,
    q: Annotated[str, Query(min_length=1, max_length=64)],
    cursor: str | None = None,
    limit: LimitQuery = 20,
) -> Page[UserPublicRead]:
    return await users_service.search_users(db, current.user_id, q.strip(), cursor, limit)


@router.get("/users/{user_id}", response_model=UserPublicRead)
async def get_user(user_id: UUID, db: DbDep, current: CurrentDep) -> UserPublicRead:
    return await users_service.get_public_profile(db, current.user_id, user_id)


@router.get("/contacts", response_model=Page[ContactRead])
async def list_contacts(
    db: DbDep, current: CurrentDep, cursor: str | None = None, limit: LimitQuery = 50
) -> Page[ContactRead]:
    return await users_service.list_contacts(db, current.user_id, cursor, limit)


@router.post("/contacts", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
async def add_contact(data: ContactCreate, db: DbDep, current: CurrentDep) -> ContactRead:
    return await users_service.add_contact(db, current.user_id, data)


@router.delete("/contacts/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_contact(user_id: UUID, db: DbDep, current: CurrentDep) -> None:
    await users_service.remove_contact(db, current.user_id, user_id)
