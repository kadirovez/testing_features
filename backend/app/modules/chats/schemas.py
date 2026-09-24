from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.modules.chats.models import ChatRole, ChatType
from app.modules.users.schemas import UserBrief

ChatTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)]
ChatDescription = Annotated[str, StringConstraints(max_length=1000)]


class DirectChatCreate(BaseModel):
    user_id: UUID


class GroupChatCreate(BaseModel):
    title: ChatTitle
    description: ChatDescription | None = None
    member_ids: list[UUID] = Field(default_factory=list, max_length=200)


class ChatUpdate(BaseModel):
    title: ChatTitle | None = None
    description: ChatDescription | None = None
    avatar_media_id: UUID | None = None


class MemberAdd(BaseModel):
    user_id: UUID


class MemberRoleUpdate(BaseModel):
    role: ChatRole


class ChatMemberRead(BaseModel):
    user: UserBrief
    role: ChatRole
    joined_at: datetime


class ChatRead(BaseModel):
    id: UUID
    type: ChatType
    title: str | None
    description: str | None
    avatar_media_id: UUID | None
    created_by: UUID | None
    created_at: datetime
    last_message_at: datetime
    my_role: ChatRole
    unread_count: int = 0
    peer: UserBrief | None = None


class MemberInfo(BaseModel):
    """Membership projection shared with other modules."""

    model_config = ConfigDict(from_attributes=True)

    chat_id: UUID
    user_id: UUID
    role: ChatRole
    chat_type: ChatType
    can_moderate: bool
    history_cleared_at: datetime | None = None
