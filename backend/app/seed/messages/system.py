from app.core.i18n.types import SystemMessageDefinition

CHAT_CREATED = SystemMessageDefinition(
    code="chat_created",
    message={"en": "{actor} created the chat", "ru": "{actor} создал(а) чат"},
)
CHAT_TITLE_CHANGED = SystemMessageDefinition(
    code="chat_title_changed",
    message={"en": "{actor} renamed the chat to \"{title}\"", "ru": "{actor} переименовал(а) чат в «{title}»"},
)
MEMBER_ADDED = SystemMessageDefinition(
    code="member_added",
    message={"en": "{actor} added {target}", "ru": "{actor} добавил(а) {target}"},
)
MEMBER_LEFT = SystemMessageDefinition(
    code="member_left",
    message={"en": "{actor} left the chat", "ru": "{actor} покинул(а) чат"},
)
MEMBER_REMOVED = SystemMessageDefinition(
    code="member_removed",
    message={"en": "{actor} removed {target}", "ru": "{actor} удалил(а) {target}"},
)
MEMBER_ROLE_CHANGED = SystemMessageDefinition(
    code="member_role_changed",
    message={
        "en": "{actor} changed the role of {target} to {role}",
        "ru": "{actor} изменил(а) роль {target} на «{role}»",
    },
)
ROLE_ADMIN = SystemMessageDefinition(
    code="role_admin",
    message={"en": "admin", "ru": "администратор"},
)
ROLE_MEMBER = SystemMessageDefinition(
    code="role_member",
    message={"en": "member", "ru": "участник"},
)
ROLE_OWNER = SystemMessageDefinition(
    code="role_owner",
    message={"en": "owner", "ru": "владелец"},
)
