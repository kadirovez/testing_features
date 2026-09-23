from starlette.requests import HTTPConnection

from app.core.i18n.types import DEFAULT_LOCALE, Locale

_SUPPORTED = {locale.value for locale in Locale}


def parse_accept_language(header: str | None) -> Locale:
    """Pick the best supported locale from an `Accept-Language` header value."""
    if not header:
        return DEFAULT_LOCALE

    candidates: list[tuple[float, int, str]] = []
    for index, part in enumerate(header.split(",")):
        pieces = part.strip().split(";")
        tag = pieces[0].strip().lower()
        if not tag:
            continue
        quality = 1.0
        for param in pieces[1:]:
            key, _, value = param.strip().partition("=")
            if key == "q":
                try:
                    quality = float(value)
                except ValueError:
                    quality = 0.0
        candidates.append((-quality, index, tag.split("-")[0]))

    for negative_quality, _, primary in sorted(candidates):
        if negative_quality < 0 and primary in _SUPPORTED:
            return Locale(primary)
    return DEFAULT_LOCALE


def resolve_locale(value: str | None) -> Locale | None:
    """Convert an explicit locale string (e.g. a query param) into a supported locale."""
    if value is None:
        return None
    primary = value.strip().lower().split("-")[0]
    return Locale(primary) if primary in _SUPPORTED else None


def get_locale(connection: HTTPConnection) -> Locale:
    """Return the locale stored on the connection state by `LocaleMiddleware`."""
    return getattr(connection.state, "locale", DEFAULT_LOCALE)
