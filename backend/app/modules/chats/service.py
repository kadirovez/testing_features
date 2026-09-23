from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.pagination import Page, decode_datetime_cursor, encode_cursor
from app.modules.chats import repository as chat_repo
from app.modules.chats.models import Chat, ChatMember, ChatRole, ChatType
from app.modules.chats.schemas import (
    ChatMemberRead,
    ChatRead,
    ChatUpdate,
    DirectChatCreate,
    GroupChatCreate,
    MemberInfo,
)
from app.modules.media import service as media_service
from app.modules.messages import service as messages_service
from app.modules.realtime import service as realtime_service
from app.modules.realtime.schemas import ChatEventPayload, MemberEventPayload, OutgoingEvent, WSEventType
from app.modules.users import service as users_service
from app.seed.errors.chats import (
    CANNOT_ADD_TO_DIRECT_CHAT,
    CANNOT_CHANGE_OWN_ROLE,
    CANNOT_CREATE_DIRECT_WITH_SELF,
    CANNOT_LEAVE_DIRECT_CHAT,
    CANNOT_MODIFY_DIRECT_CHAT,
    CANNOT_REMOVE_OWNER,
    CHAT_NOT_FOUND,
    INVALID_CHAT_AVATAR,
    MEMBER_NOT_FOUND,
    NOT_ALLOWED_TO_ADD_MEMBERS,
    NOT_ALLOWED_TO_CHANGE_ROLES,
    NOT_ALLOWED_TO_DELETE_CHAT,
    NOT_ALLOWED_TO_EDIT_CHAT,
    NOT_ALLOWED_TO_REMOVE_MEMBERS,
    NOT_CHAT_MEMBER,
    OWNER_MUST_TRANSFER_OWNERSHIP,
    USER_ALREADY_MEMBER,
)
from app.seed.errors.users import USER_NOT_FOUND
from app.seed.messages.system import (
    CHAT_CREATED,
    CHAT_TITLE_CHANGED,
    MEMBER_ADDED,
    MEMBER_LEFT,
    MEMBER_REMOVED,
    MEMBER_ROLE_CHANGED,
)

_MANAGER_ROLES = (ChatRole.OWNER, ChatRole.ADMIN)


def _direct_key(user_a: UUID, user_b: UUID) -> str:
    first, second = sorted((str(user_a), str(user_b)))
    return f"{first}:{second}"


async def _build_chat_reads(db: AsyncSession, user_id: UUID, rows: Sequence[tuple[Chat, ChatMember]]) -> list[ChatRead]:
    chat_ids = [chat.id for chat, _ in rows]
    unread = await messages_service.count_unread_by_chats(db, user_id, chat_ids)
    direct_ids = [chat.id for chat, _ in rows if chat.type == ChatType.DIRECT]
    peer_pairs = await chat_repo.list_other_member_ids(db, direct_ids, user_id)
    peers = await users_service.get_users_brief(db, [peer_id for _, peer_id in peer_pairs])
    peer_by_chat = {chat_id: peers.get(peer_id) for chat_id, peer_id in peer_pairs}
    return [
        ChatRead(
            id=chat.id,
            type=chat.type,
            title=chat.title,
            description=chat.description,
            avatar_media_id=chat.avatar_media_id,
            created_by=chat.created_by,
            created_at=chat.created_at,
            last_message_at=chat.last_message_at,
            my_role=member.role,
            unread_count=unread.get(chat.id, 0),
            peer=peer_by_chat.get(chat.id),
        )
        for chat, member in rows
    ]


async def _build_chat_read(db: AsyncSession, user_id: UUID, chat: Chat, member: ChatMember) -> ChatRead:
    return (await _build_chat_reads(db, user_id, [(chat, member)]))[0]


async def _user_label(db: AsyncSession, user_id: UUID) -> str:
    return (await users_service.get_user_brief(db, user_id)).display_name


async def _publish(user_ids: Sequence[UUID], event_type: WSEventType, payload: ChatEventPayload | MemberEventPayload) -> None:
    await realtime_service.publish_to_users(list(user_ids), OutgoingEvent(type=event_type, payload=payload))


async def _get_chat_or_raise(db: AsyncSession, chat_id: UUID) -> Chat:
    chat = await chat_repo.get_by_id(db, chat_id)
    # chat does not exist or was deleted
    if chat is None:
        raise AppError(CHAT_NOT_FOUND)

    return chat


async def create_direct_chat(db: AsyncSession, actor_id: UUID, data: DirectChatCreate) -> ChatRead:
    """Return the direct chat between two users, creating it on first request."""
    # users cannot open a direct chat with themselves
    if data.user_id == actor_id:
        raise AppError(CANNOT_CREATE_DIRECT_WITH_SELF)

    await users_service.get_user_brief(db, data.user_id)
    direct_key = _direct_key(actor_id, data.user_id)
    existing = await chat_repo.get_by_direct_key(db, direct_key)
    if existing is not None:
        member = await chat_repo.get_member_any_state(db, existing.id, actor_id)
        return await _build_chat_read(db, actor_id, existing, member)

    chat = await chat_repo.create_chat(db, type=ChatType.DIRECT, created_by=actor_id, direct_key=direct_key)
    await chat_repo.add_members(db, chat.id, [(actor_id, ChatRole.MEMBER), (data.user_id, ChatRole.MEMBER)])
    await db.commit()
    await _publish([actor_id, data.user_id], WSEventType.MEMBER_ADDED, MemberEventPayload(chat_id=chat.id, user_ids=[actor_id, data.user_id]))
    member = await chat_repo.get_member(db, chat.id, actor_id)
    return await _build_chat_read(db, actor_id, chat, member)


async def create_group_chat(db: AsyncSession, actor_id: UUID, data: GroupChatCreate) -> ChatRead:
    """Create a group chat owned by the actor with the initial members."""
    member_ids = list(dict.fromkeys(uid for uid in data.member_ids if uid != actor_id))
    users = await users_service.get_users_brief(db, member_ids)
    # some of the requested members do not exist
    if len(users) != len(member_ids):
        raise AppError(USER_NOT_FOUND)

    chat = await chat_repo.create_chat(
        db, type=ChatType.GROUP, title=data.title, description=data.description, created_by=actor_id
    )
    await chat_repo.add_members(
        db, chat.id, [(actor_id, ChatRole.OWNER), *[(uid, ChatRole.MEMBER) for uid in member_ids]]
    )
    await db.commit()
    all_ids = [actor_id, *member_ids]
    await _publish(all_ids, WSEventType.MEMBER_ADDED, MemberEventPayload(chat_id=chat.id, user_ids=all_ids))
    await messages_service.create_system_message(
        db, chat.id, actor_id, CHAT_CREATED, {"actor": await _user_label(db, actor_id)}
    )
    chat = await _get_chat_or_raise(db, chat.id)
    member = await chat_repo.get_member(db, chat.id, actor_id)
    return await _build_chat_read(db, actor_id, chat, member)


async def list_user_chats(db: AsyncSession, user_id: UUID, cursor: str | None, limit: int) -> Page[ChatRead]:
    """List the user's chats ordered by latest activity."""
    after = decode_datetime_cursor(cursor) if cursor else None
    rows = await chat_repo.list_user_chats(db, user_id, after, limit + 1)
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = encode_cursor(rows[-1][0].last_message_at, rows[-1][0].id) if has_more else None
    return Page(items=await _build_chat_reads(db, user_id, rows), next_cursor=next_cursor)


async def get_chat(db: AsyncSession, user_id: UUID, chat_id: UUID) -> ChatRead:
    """Return a chat the user is a member of."""
    chat = await _get_chat_or_raise(db, chat_id)
    member = await chat_repo.get_member(db, chat_id, user_id)
    # user is not a member of the chat
    if member is None:
        raise AppError(NOT_CHAT_MEMBER)

    return await _build_chat_read(db, user_id, chat, member)


async def update_chat(db: AsyncSession, actor_id: UUID, chat_id: UUID, data: ChatUpdate) -> ChatRead:
    """Update title, description or avatar of a group chat."""
    chat = await _get_chat_or_raise(db, chat_id)
    # direct chats have no editable attributes
    if chat.type == ChatType.DIRECT:
        raise AppError(CANNOT_MODIFY_DIRECT_CHAT)

    member = await chat_repo.get_member(db, chat_id, actor_id)
    # actor is not a member of the chat
    if member is None:
        raise AppError(NOT_CHAT_MEMBER)

    # only owners and admins can edit the chat
    if member.role not in _MANAGER_ROLES:
        raise AppError(NOT_ALLOWED_TO_EDIT_CHAT)

    values = data.model_dump(exclude_unset=True, exclude_none=True)
    avatar_media_id = values.get("avatar_media_id")
    # chat avatar must be a photo uploaded by the actor for this purpose
    if avatar_media_id is not None and not await media_service.is_valid_chat_avatar(db, avatar_media_id, actor_id):
        raise AppError(INVALID_CHAT_AVATAR)

    if not values:
        return await _build_chat_read(db, actor_id, chat, member)
    title_changed = "title" in values and values["title"] != chat.title
    chat = await chat_repo.update_chat(db, chat_id, values)
    await db.commit()
    await _publish(await chat_repo.list_active_member_ids(db, chat_id), WSEventType.CHAT_UPDATED, ChatEventPayload(chat_id=chat_id))
    if title_changed:
        await messages_service.create_system_message(
            db, chat_id, actor_id, CHAT_TITLE_CHANGED, {"actor": await _user_label(db, actor_id), "title": chat.title}
        )
    return await _build_chat_read(db, actor_id, chat, member)


async def delete_chat(db: AsyncSession, actor_id: UUID, chat_id: UUID) -> None:
    """Soft-delete a group chat (owner only)."""
    chat = await _get_chat_or_raise(db, chat_id)
    # direct chats cannot be deleted
    if chat.type == ChatType.DIRECT:
        raise AppError(CANNOT_MODIFY_DIRECT_CHAT)

    member = await chat_repo.get_member(db, chat_id, actor_id)
    # actor is not a member of the chat
    if member is None:
        raise AppError(NOT_CHAT_MEMBER)

    # only the owner can delete the chat
    if member.role != ChatRole.OWNER:
        raise AppError(NOT_ALLOWED_TO_DELETE_CHAT)

    member_ids = await chat_repo.list_active_member_ids(db, chat_id)
    await chat_repo.update_chat(db, chat_id, {"deleted_at": datetime.now(UTC)})
    await db.commit()
    await _publish(member_ids, WSEventType.CHAT_UPDATED, ChatEventPayload(chat_id=chat_id, deleted=True))


async def list_members(db: AsyncSession, actor_id: UUID, chat_id: UUID) -> list[ChatMemberRead]:
    """List active members of a chat the actor belongs to."""
    await _get_chat_or_raise(db, chat_id)
    # actor is not a member of the chat
    if await chat_repo.get_member(db, chat_id, actor_id) is None:
        raise AppError(NOT_CHAT_MEMBER)

    members = await chat_repo.list_active_members(db, chat_id)
    users = await users_service.get_users_brief(db, [member.user_id for member in members])
    return [
        ChatMemberRead(user=users[member.user_id], role=member.role, joined_at=member.joined_at)
        for member in members
        if member.user_id in users
    ]


async def add_member_to_chat(db: AsyncSession, chat_id: UUID, actor_id: UUID, new_member_id: UUID) -> ChatMemberRead:
    """Add a user to a group chat, enforcing role and duplicate-membership checks."""
    chat = await _get_chat_or_raise(db, chat_id)
    # only group chats support adding members
    if chat.type != ChatType.GROUP:
        raise AppError(CANNOT_ADD_TO_DIRECT_CHAT)

    actor_member = await chat_repo.get_member(db, chat_id, actor_id)
    # actor is not a member or lacks permissions
    if actor_member is None or actor_member.role not in _MANAGER_ROLES:
        raise AppError(NOT_ALLOWED_TO_ADD_MEMBERS)

    new_user = await users_service.get_user_brief(db, new_member_id)
    existing = await chat_repo.get_member_any_state(db, chat_id, new_member_id)
    # user is already in the chat
    if existing is not None and existing.left_at is None:
        raise AppError(USER_ALREADY_MEMBER)

    if existing is not None:
        member = await chat_repo.update_member(
            db, existing.id, {"left_at": None, "role": ChatRole.MEMBER, "joined_at": datetime.now(UTC)}
        )
    else:
        member = await chat_repo.add_member(db, chat_id, new_member_id, ChatRole.MEMBER)
    await db.commit()
    await _publish(
        await chat_repo.list_active_member_ids(db, chat_id),
        WSEventType.MEMBER_ADDED,
        MemberEventPayload(chat_id=chat_id, user_ids=[new_member_id]),
    )
    await messages_service.create_system_message(
        db,
        chat_id,
        actor_id,
        MEMBER_ADDED,
        {"actor": await _user_label(db, actor_id), "target": new_user.display_name, "target_id": str(new_member_id)},
    )
    return ChatMemberRead(user=new_user, role=member.role, joined_at=member.joined_at)


async def remove_member(db: AsyncSession, actor_id: UUID, chat_id: UUID, user_id: UUID) -> None:
    """Remove a member from a group chat."""
    chat = await _get_chat_or_raise(db, chat_id)
    # direct chats have a fixed pair of members
    if chat.type == ChatType.DIRECT:
        raise AppError(CANNOT_MODIFY_DIRECT_CHAT)

    actor_member = await chat_repo.get_member(db, chat_id, actor_id)
    # actor is not a member of the chat
    if actor_member is None:
        raise AppError(NOT_CHAT_MEMBER)

    target = await chat_repo.get_member(db, chat_id, user_id)
    # target is not an active member
    if target is None:
        raise AppError(MEMBER_NOT_FOUND)

    # the owner can never be removed
    if target.role == ChatRole.OWNER:
        raise AppError(CANNOT_REMOVE_OWNER)

    can_remove = actor_member.role == ChatRole.OWNER or (
        actor_member.role == ChatRole.ADMIN and target.role == ChatRole.MEMBER
    )
    # owner removes anyone, admin removes only plain members
    if not can_remove:
        raise AppError(NOT_ALLOWED_TO_REMOVE_MEMBERS)

    recipients = await chat_repo.list_active_member_ids(db, chat_id)
    await chat_repo.update_member(db, target.id, {"left_at": datetime.now(UTC)})
    await db.commit()
    await _publish(recipients, WSEventType.MEMBER_REMOVED, MemberEventPayload(chat_id=chat_id, user_ids=[user_id]))
    await messages_service.create_system_message(
        db,
        chat_id,
        actor_id,
        MEMBER_REMOVED,
        {"actor": await _user_label(db, actor_id), "target": await _user_label(db, user_id), "target_id": str(user_id)},
    )


async def change_member_role(db: AsyncSession, actor_id: UUID, chat_id: UUID, user_id: UUID, role: ChatRole) -> ChatMemberRead:
    """Change a member's role; assigning `owner` transfers ownership (the old owner becomes admin)."""
    chat = await _get_chat_or_raise(db, chat_id)
    # direct chats have no roles to manage
    if chat.type == ChatType.DIRECT:
        raise AppError(CANNOT_MODIFY_DIRECT_CHAT)

    actor_member = await chat_repo.get_member(db, chat_id, actor_id)
    # actor is not a member of the chat
    if actor_member is None:
        raise AppError(NOT_CHAT_MEMBER)

    # actors cannot change their own role
    if user_id == actor_id:
        raise AppError(CANNOT_CHANGE_OWN_ROLE)

    # only the owner manages roles
    if actor_member.role != ChatRole.OWNER:
        raise AppError(NOT_ALLOWED_TO_CHANGE_ROLES)

    target = await chat_repo.get_member(db, chat_id, user_id)
    # target is not an active member
    if target is None:
        raise AppError(MEMBER_NOT_FOUND)

    if role == ChatRole.OWNER:
        await chat_repo.update_member(db, actor_member.id, {"role": ChatRole.ADMIN})
    target = await chat_repo.update_member(db, target.id, {"role": role})
    await db.commit()
    await _publish(await chat_repo.list_active_member_ids(db, chat_id), WSEventType.CHAT_UPDATED, ChatEventPayload(chat_id=chat_id))
    target_user = await users_service.get_user_brief(db, user_id)
    await messages_service.create_system_message(
        db,
        chat_id,
        actor_id,
        MEMBER_ROLE_CHANGED,
        {
            "actor": await _user_label(db, actor_id),
            "target": target_user.display_name,
            "target_id": str(user_id),
            "role": role.value,
        },
    )
    return ChatMemberRead(user=target_user, role=target.role, joined_at=target.joined_at)


async def leave_chat(db: AsyncSession, actor_id: UUID, chat_id: UUID) -> None:
    """Leave a group chat; the last remaining owner leaving deletes the chat."""
    chat = await _get_chat_or_raise(db, chat_id)
    # direct chats cannot be left
    if chat.type == ChatType.DIRECT:
        raise AppError(CANNOT_LEAVE_DIRECT_CHAT)

    member = await chat_repo.get_member(db, chat_id, actor_id)
    # actor is not a member of the chat
    if member is None:
        raise AppError(NOT_CHAT_MEMBER)

    member_count = await chat_repo.count_active_members(db, chat_id)
    # the owner must hand over ownership while other members remain
    if member.role == ChatRole.OWNER and member_count > 1:
        raise AppError(OWNER_MUST_TRANSFER_OWNERSHIP)

    recipients = await chat_repo.list_active_member_ids(db, chat_id)
    now = datetime.now(UTC)
    await chat_repo.update_member(db, member.id, {"left_at": now})
    if member_count == 1:
        await chat_repo.update_chat(db, chat_id, {"deleted_at": now})
    await db.commit()
    await _publish(recipients, WSEventType.MEMBER_REMOVED, MemberEventPayload(chat_id=chat_id, user_ids=[actor_id]))
    if member_count > 1:
        await messages_service.create_system_message(
            db, chat_id, actor_id, MEMBER_LEFT, {"actor": await _user_label(db, actor_id)}
        )


async def ensure_member(db: AsyncSession, chat_id: UUID, user_id: UUID) -> MemberInfo:
    """Return the user's membership in a chat or raise if the user is not a member."""
    chat = await _get_chat_or_raise(db, chat_id)
    member = await chat_repo.get_member(db, chat_id, user_id)
    # user is not a member of the chat
    if member is None:
        raise AppError(NOT_CHAT_MEMBER)

    return MemberInfo(
        chat_id=chat_id,
        user_id=user_id,
        role=member.role,
        chat_type=chat.type,
        can_moderate=chat.type == ChatType.GROUP and member.role in _MANAGER_ROLES,
    )


async def is_member(db: AsyncSession, chat_id: UUID, user_id: UUID) -> bool:
    """Check active membership in a non-deleted chat."""
    chat = await chat_repo.get_by_id(db, chat_id)
    return chat is not None and await chat_repo.get_member(db, chat_id, user_id) is not None


async def get_active_member_ids(db: AsyncSession, chat_id: UUID) -> list[UUID]:
    """Return ids of active members of a chat."""
    return await chat_repo.list_active_member_ids(db, chat_id)


async def get_user_chat_ids(db: AsyncSession, user_id: UUID) -> list[UUID]:
    """Return ids of chats where the user is an active member."""
    return await chat_repo.list_user_chat_ids(db, user_id)


async def get_chat_peer_ids(db: AsyncSession, user_id: UUID) -> list[UUID]:
    """Return users sharing at least one chat with the user."""
    return await chat_repo.list_peer_ids(db, user_id)


async def touch_last_message_at(db: AsyncSession, chat_id: UUID, at: datetime) -> None:
    """Move the chat's activity timestamp forward inside the caller's transaction."""
    await chat_repo.set_last_message_at(db, chat_id, at)
