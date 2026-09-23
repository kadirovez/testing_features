from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.pagination import Page
from app.modules.auth.dependencies import get_current_session
from app.modules.auth.schemas import CurrentSession
from app.modules.chats import service as chats_service
from app.modules.chats.schemas import (
    ChatMemberRead,
    ChatRead,
    ChatUpdate,
    DirectChatCreate,
    GroupChatCreate,
    MemberAdd,
    MemberRoleUpdate,
)

router = APIRouter(prefix="/chats", tags=["chats"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentDep = Annotated[CurrentSession, Depends(get_current_session)]
LimitQuery = Annotated[int, Query(ge=1, le=settings.PAGINATION_MAX_LIMIT)]


@router.post("/direct", response_model=ChatRead)
async def create_direct_chat(data: DirectChatCreate, db: DbDep, current: CurrentDep) -> ChatRead:
    return await chats_service.create_direct_chat(db, current.user_id, data)


@router.post("/group", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
async def create_group_chat(data: GroupChatCreate, db: DbDep, current: CurrentDep) -> ChatRead:
    return await chats_service.create_group_chat(db, current.user_id, data)


@router.get("", response_model=Page[ChatRead])
async def list_chats(
    db: DbDep, current: CurrentDep, cursor: str | None = None, limit: LimitQuery = settings.PAGINATION_DEFAULT_LIMIT
) -> Page[ChatRead]:
    return await chats_service.list_user_chats(db, current.user_id, cursor, limit)


@router.get("/{chat_id}", response_model=ChatRead)
async def get_chat(chat_id: UUID, db: DbDep, current: CurrentDep) -> ChatRead:
    return await chats_service.get_chat(db, current.user_id, chat_id)


@router.patch("/{chat_id}", response_model=ChatRead)
async def update_chat(chat_id: UUID, data: ChatUpdate, db: DbDep, current: CurrentDep) -> ChatRead:
    return await chats_service.update_chat(db, current.user_id, chat_id, data)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(chat_id: UUID, db: DbDep, current: CurrentDep) -> None:
    await chats_service.delete_chat(db, current.user_id, chat_id)


@router.get("/{chat_id}/members", response_model=list[ChatMemberRead])
async def list_members(chat_id: UUID, db: DbDep, current: CurrentDep) -> list[ChatMemberRead]:
    return await chats_service.list_members(db, current.user_id, chat_id)


@router.post("/{chat_id}/members", response_model=ChatMemberRead, status_code=status.HTTP_201_CREATED)
async def add_member(chat_id: UUID, data: MemberAdd, db: DbDep, current: CurrentDep) -> ChatMemberRead:
    return await chats_service.add_member_to_chat(db, chat_id, current.user_id, data.user_id)


@router.patch("/{chat_id}/members/{user_id}", response_model=ChatMemberRead)
async def change_member_role(
    chat_id: UUID, user_id: UUID, data: MemberRoleUpdate, db: DbDep, current: CurrentDep
) -> ChatMemberRead:
    return await chats_service.change_member_role(db, current.user_id, chat_id, user_id, data.role)


@router.delete("/{chat_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(chat_id: UUID, user_id: UUID, db: DbDep, current: CurrentDep) -> None:
    await chats_service.remove_member(db, current.user_id, chat_id, user_id)


@router.post("/{chat_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_chat(chat_id: UUID, db: DbDep, current: CurrentDep) -> None:
    await chats_service.leave_chat(db, current.user_id, chat_id)
