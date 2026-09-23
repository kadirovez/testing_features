from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.i18n.locale import get_locale
from app.core.pagination import Page
from app.modules.auth.dependencies import get_current_session
from app.modules.auth.schemas import CurrentSession
from app.modules.messages import service as messages_service
from app.modules.messages.schemas import (
    DeliveredRequest,
    MessageCreate,
    MessageRead,
    MessageStatusRead,
    MessageUpdate,
    ReadRequest,
)

router = APIRouter(tags=["messages"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentDep = Annotated[CurrentSession, Depends(get_current_session)]
LimitQuery = Annotated[int, Query(ge=1, le=settings.PAGINATION_MAX_LIMIT)]


@router.post("/chats/{chat_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    chat_id: UUID, data: MessageCreate, request: Request, db: DbDep, current: CurrentDep
) -> MessageRead:
    return await messages_service.send_message(db, chat_id, current.user_id, data, get_locale(request))


@router.get("/chats/{chat_id}/messages", response_model=Page[MessageRead])
async def list_messages(
    chat_id: UUID,
    request: Request,
    db: DbDep,
    current: CurrentDep,
    cursor: str | None = None,
    limit: LimitQuery = settings.PAGINATION_DEFAULT_LIMIT,
) -> Page[MessageRead]:
    return await messages_service.list_messages(db, current.user_id, chat_id, cursor, limit, get_locale(request))


@router.post("/chats/{chat_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(chat_id: UUID, data: ReadRequest, db: DbDep, current: CurrentDep) -> None:
    await messages_service.mark_read_up_to(db, current.user_id, chat_id, data.up_to_message_id)


@router.post("/messages/delivered", status_code=status.HTTP_204_NO_CONTENT)
async def mark_delivered(data: DeliveredRequest, db: DbDep, current: CurrentDep) -> None:
    await messages_service.mark_delivered(db, current.user_id, data.message_ids)


@router.patch("/messages/{message_id}", response_model=MessageRead)
async def edit_message(
    message_id: UUID, data: MessageUpdate, request: Request, db: DbDep, current: CurrentDep
) -> MessageRead:
    return await messages_service.edit_message(db, current.user_id, message_id, data, get_locale(request))


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(message_id: UUID, db: DbDep, current: CurrentDep) -> None:
    await messages_service.delete_message(db, current.user_id, message_id)


@router.get("/messages/{message_id}/statuses", response_model=list[MessageStatusRead])
async def get_message_statuses(message_id: UUID, db: DbDep, current: CurrentDep) -> list[MessageStatusRead]:
    return await messages_service.get_message_statuses(db, current.user_id, message_id)
