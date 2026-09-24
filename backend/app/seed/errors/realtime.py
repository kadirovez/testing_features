from app.core.i18n.types import ErrorDefinition

# status_code values in the 4xxx range are WebSocket close/error codes.

EVENT_PAYLOAD_INVALID = ErrorDefinition(
    code="event_payload_invalid",
    status_code=4400,
    message={"en": "invalid event payload", "ru": "некорректные данные события"},
)
EVENT_RATE_LIMIT_EXCEEDED = ErrorDefinition(
    code="event_rate_limit_exceeded",
    status_code=4429,
    message={"en": "too many events, slow down", "ru": "слишком много событий, снизьте частоту"},
)
EVENT_TYPE_UNKNOWN = ErrorDefinition(
    code="event_type_unknown",
    status_code=4400,
    message={"en": "unknown event type", "ru": "неизвестный тип события"},
)
WS_SESSION_REVOKED = ErrorDefinition(
    code="ws_session_revoked",
    status_code=4403,
    message={"en": "session has been revoked", "ru": "сессия была отозвана"},
)
WS_UNAUTHORIZED = ErrorDefinition(
    code="ws_unauthorized",
    status_code=4401,
    message={"en": "authentication failed", "ru": "ошибка аутентификации"},
)
