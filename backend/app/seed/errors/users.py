from app.core.i18n.types import ErrorDefinition

CANNOT_ADD_SELF_TO_CONTACTS = ErrorDefinition(
    code="cannot_add_self_to_contacts",
    status_code=400,
    message={"en": "cannot add yourself to contacts", "ru": "нельзя добавить себя в контакты"},
)
CONTACT_ALREADY_EXISTS = ErrorDefinition(
    code="contact_already_exists",
    status_code=409,
    message={"en": "user is already in your contacts", "ru": "пользователь уже есть в контактах"},
)
CONTACT_NOT_FOUND = ErrorDefinition(
    code="contact_not_found",
    status_code=404,
    message={"en": "contact not found", "ru": "контакт не найден"},
)
EMAIL_ALREADY_TAKEN = ErrorDefinition(
    code="email_already_taken",
    status_code=409,
    message={"en": "email is already registered", "ru": "этот email уже зарегистрирован"},
)
INVALID_AVATAR_MEDIA = ErrorDefinition(
    code="invalid_avatar_media",
    status_code=400,
    message={"en": "media cannot be used as an avatar", "ru": "этот файл нельзя использовать как аватар"},
)
USERNAME_ALREADY_TAKEN = ErrorDefinition(
    code="username_already_taken",
    status_code=409,
    message={"en": "username is already taken", "ru": "это имя пользователя уже занято"},
)
USER_NOT_FOUND = ErrorDefinition(
    code="user_not_found",
    status_code=404,
    message={"en": "user not found", "ru": "пользователь не найден"},
)
