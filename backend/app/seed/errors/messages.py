from app.core.i18n.types import ErrorDefinition

EMPTY_MESSAGE = ErrorDefinition(
    code="empty_message",
    status_code=400,
    message={"en": "message must contain text or media", "ru": "сообщение должно содержать текст или медиа"},
)
MEDIA_NOT_ATTACHABLE = ErrorDefinition(
    code="media_not_attachable",
    status_code=400,
    message={
        "en": "media cannot be attached to a message",
        "ru": "файл нельзя прикрепить к сообщению",
    },
)
MESSAGE_ALREADY_DELETED = ErrorDefinition(
    code="message_already_deleted",
    status_code=409,
    message={"en": "message has already been deleted", "ru": "сообщение уже удалено"},
)
MESSAGE_NOT_EDITABLE = ErrorDefinition(
    code="message_not_editable",
    status_code=400,
    message={"en": "this message cannot be edited", "ru": "это сообщение нельзя редактировать"},
)
MESSAGE_NOT_FOUND = ErrorDefinition(
    code="message_not_found",
    status_code=404,
    message={"en": "message not found", "ru": "сообщение не найдено"},
)
NOT_MESSAGE_AUTHOR = ErrorDefinition(
    code="not_message_author",
    status_code=403,
    message={"en": "only the author can do this", "ru": "это может сделать только автор сообщения"},
)
REPLY_TARGET_NOT_FOUND = ErrorDefinition(
    code="reply_target_not_found",
    status_code=400,
    message={"en": "replied message not found in this chat", "ru": "сообщение для ответа не найдено в этом чате"},
)
TOO_MANY_ATTACHMENTS = ErrorDefinition(
    code="too_many_attachments",
    status_code=400,
    message={"en": "too many attachments", "ru": "слишком много вложений"},
)
