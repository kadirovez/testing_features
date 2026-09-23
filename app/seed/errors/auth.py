from app.core.i18n.types import ErrorDefinition

ACCESS_TOKEN_EXPIRED = ErrorDefinition(
    code="access_token_expired",
    status_code=401,
    message={"en": "access token has expired", "ru": "срок действия access-токена истёк"},
)
ACCESS_TOKEN_INVALID = ErrorDefinition(
    code="access_token_invalid",
    status_code=401,
    message={"en": "access token is invalid", "ru": "недействительный access-токен"},
)
AUTH_HEADER_MISSING = ErrorDefinition(
    code="auth_header_missing",
    status_code=401,
    message={"en": "authentication required", "ru": "требуется аутентификация"},
)
INVALID_CREDENTIALS = ErrorDefinition(
    code="invalid_credentials",
    status_code=401,
    message={"en": "invalid email or password", "ru": "неверный email или пароль"},
)
REFRESH_TOKEN_EXPIRED = ErrorDefinition(
    code="refresh_token_expired",
    status_code=401,
    message={"en": "refresh token has expired", "ru": "срок действия refresh-токена истёк"},
)
REFRESH_TOKEN_INVALID = ErrorDefinition(
    code="refresh_token_invalid",
    status_code=401,
    message={"en": "refresh token is invalid", "ru": "недействительный refresh-токен"},
)
REFRESH_TOKEN_MISMATCH = ErrorDefinition(
    code="refresh_token_mismatch",
    status_code=401,
    message={
        "en": "refresh token was already used, the session has been revoked",
        "ru": "refresh-токен уже был использован, сессия отозвана",
    },
)
SESSION_EXPIRED = ErrorDefinition(
    code="session_expired",
    status_code=401,
    message={"en": "session has expired", "ru": "срок действия сессии истёк"},
)
SESSION_NOT_FOUND = ErrorDefinition(
    code="session_not_found",
    status_code=404,
    message={"en": "session not found", "ru": "сессия не найдена"},
)
SESSION_REVOKED = ErrorDefinition(
    code="session_revoked",
    status_code=401,
    message={"en": "session has been revoked", "ru": "сессия была отозвана"},
)
USER_INACTIVE = ErrorDefinition(
    code="user_inactive",
    status_code=403,
    message={"en": "user account is inactive", "ru": "учётная запись деактивирована"},
)
