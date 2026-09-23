from app.core.i18n.types import ErrorDefinition

CANNOT_ADD_TO_DIRECT_CHAT = ErrorDefinition(
    code="cannot_add_to_direct_chat",
    status_code=400,
    message={"en": "cannot add members to a direct chat", "ru": "нельзя добавить участника в личный чат"},
)
CANNOT_CHANGE_OWN_ROLE = ErrorDefinition(
    code="cannot_change_own_role",
    status_code=400,
    message={"en": "cannot change your own role", "ru": "нельзя изменить собственную роль"},
)
CANNOT_CREATE_DIRECT_WITH_SELF = ErrorDefinition(
    code="cannot_create_direct_with_self",
    status_code=400,
    message={"en": "cannot create a direct chat with yourself", "ru": "нельзя создать личный чат с самим собой"},
)
CANNOT_LEAVE_DIRECT_CHAT = ErrorDefinition(
    code="cannot_leave_direct_chat",
    status_code=400,
    message={"en": "cannot leave a direct chat", "ru": "нельзя покинуть личный чат"},
)
CANNOT_MODIFY_DIRECT_CHAT = ErrorDefinition(
    code="cannot_modify_direct_chat",
    status_code=400,
    message={"en": "direct chats cannot be modified", "ru": "личный чат нельзя изменять"},
)
CANNOT_REMOVE_OWNER = ErrorDefinition(
    code="cannot_remove_owner",
    status_code=400,
    message={"en": "cannot remove the chat owner", "ru": "нельзя удалить владельца чата"},
)
CHAT_NOT_FOUND = ErrorDefinition(
    code="chat_not_found",
    status_code=404,
    message={"en": "chat not found", "ru": "чат не найден"},
)
INVALID_CHAT_AVATAR = ErrorDefinition(
    code="invalid_chat_avatar",
    status_code=400,
    message={"en": "media cannot be used as a chat avatar", "ru": "этот файл нельзя использовать как аватар чата"},
)
MEMBER_NOT_FOUND = ErrorDefinition(
    code="member_not_found",
    status_code=404,
    message={"en": "chat member not found", "ru": "участник чата не найден"},
)
NOT_ALLOWED_TO_ADD_MEMBERS = ErrorDefinition(
    code="not_allowed_to_add_members",
    status_code=403,
    message={"en": "not allowed to add members", "ru": "недостаточно прав для добавления участников"},
)
NOT_ALLOWED_TO_CHANGE_ROLES = ErrorDefinition(
    code="not_allowed_to_change_roles",
    status_code=403,
    message={"en": "not allowed to change member roles", "ru": "недостаточно прав для изменения ролей"},
)
NOT_ALLOWED_TO_DELETE_CHAT = ErrorDefinition(
    code="not_allowed_to_delete_chat",
    status_code=403,
    message={"en": "only the owner can delete the chat", "ru": "удалить чат может только владелец"},
)
NOT_ALLOWED_TO_EDIT_CHAT = ErrorDefinition(
    code="not_allowed_to_edit_chat",
    status_code=403,
    message={"en": "not allowed to edit the chat", "ru": "недостаточно прав для редактирования чата"},
)
NOT_ALLOWED_TO_REMOVE_MEMBERS = ErrorDefinition(
    code="not_allowed_to_remove_members",
    status_code=403,
    message={"en": "not allowed to remove this member", "ru": "недостаточно прав для удаления участника"},
)
NOT_CHAT_MEMBER = ErrorDefinition(
    code="not_chat_member",
    status_code=403,
    message={"en": "you are not a member of this chat", "ru": "вы не являетесь участником этого чата"},
)
OWNER_MUST_TRANSFER_OWNERSHIP = ErrorDefinition(
    code="owner_must_transfer_ownership",
    status_code=400,
    message={
        "en": "transfer ownership before leaving the chat",
        "ru": "передайте права владельца перед выходом из чата",
    },
)
USER_ALREADY_MEMBER = ErrorDefinition(
    code="user_already_member",
    status_code=409,
    message={"en": "user is already a member", "ru": "пользователь уже состоит в чате"},
)
