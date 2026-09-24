from app.core.i18n.types import ErrorDefinition

MEDIA_ACCESS_DENIED = ErrorDefinition(
    code="media_access_denied",
    status_code=403,
    message={"en": "access to this media is denied", "ru": "доступ к этому файлу запрещён"},
)
MEDIA_ALREADY_CONFIRMED = ErrorDefinition(
    code="media_already_confirmed",
    status_code=409,
    message={"en": "upload has already been confirmed", "ru": "загрузка уже подтверждена"},
)
MEDIA_NOT_FOUND = ErrorDefinition(
    code="media_not_found",
    status_code=404,
    message={"en": "media not found", "ru": "файл не найден"},
)
MEDIA_NOT_READY = ErrorDefinition(
    code="media_not_ready",
    status_code=409,
    message={"en": "media is not processed yet", "ru": "файл ещё не обработан"},
)
MEDIA_TOO_LARGE = ErrorDefinition(
    code="media_too_large",
    status_code=413,
    message={"en": "file is too large", "ru": "файл слишком большой"},
)
UNSUPPORTED_MEDIA_TYPE = ErrorDefinition(
    code="unsupported_media_type",
    status_code=415,
    message={"en": "unsupported media type", "ru": "неподдерживаемый тип файла"},
)
UPLOAD_NOT_FOUND_IN_STORAGE = ErrorDefinition(
    code="upload_not_found_in_storage",
    status_code=409,
    message={"en": "file was not uploaded to storage", "ru": "файл не был загружен в хранилище"},
)
