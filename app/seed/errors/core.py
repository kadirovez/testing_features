from app.core.i18n.types import ErrorDefinition

INTERNAL_SERVER_ERROR = ErrorDefinition(
    code="internal_server_error",
    status_code=500,
    message={"en": "internal server error", "ru": "внутренняя ошибка сервера"},
)
INVALID_CURSOR = ErrorDefinition(
    code="invalid_cursor",
    status_code=400,
    message={"en": "invalid pagination cursor", "ru": "некорректный курсор пагинации"},
)
METHOD_NOT_ALLOWED = ErrorDefinition(
    code="method_not_allowed",
    status_code=405,
    message={"en": "method not allowed", "ru": "метод не поддерживается"},
)
RATE_LIMIT_EXCEEDED = ErrorDefinition(
    code="rate_limit_exceeded",
    status_code=429,
    message={"en": "too many requests, try again later", "ru": "слишком много запросов, попробуйте позже"},
)
ROUTE_NOT_FOUND = ErrorDefinition(
    code="route_not_found",
    status_code=404,
    message={"en": "resource not found", "ru": "ресурс не найден"},
)
VALIDATION_FAILED = ErrorDefinition(
    code="validation_failed",
    status_code=422,
    message={"en": "request validation failed", "ru": "ошибка валидации запроса"},
)
