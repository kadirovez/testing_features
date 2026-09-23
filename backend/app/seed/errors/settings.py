from app.core.i18n.types import ErrorDefinition

INVALID_THEME_CONFIG = ErrorDefinition(
    code="invalid_theme_config",
    status_code=422,
    message={"en": "theme config is nested too deeply", "ru": "слишком глубокая вложенность конфига темы"},
)
THEME_CONFIG_TOO_LARGE = ErrorDefinition(
    code="theme_config_too_large",
    status_code=413,
    message={"en": "theme config is too large", "ru": "конфиг темы слишком большой"},
)
UNSUPPORTED_LANGUAGE = ErrorDefinition(
    code="unsupported_language",
    status_code=422,
    message={"en": "unsupported language", "ru": "неподдерживаемый язык"},
)
