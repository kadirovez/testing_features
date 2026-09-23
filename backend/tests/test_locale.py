import pytest

from app.core.i18n.locale import parse_accept_language
from app.core.i18n.types import Locale


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        (None, Locale.EN),
        ("", Locale.EN),
        ("ru", Locale.RU),
        ("ru-RU,ru;q=0.9,en;q=0.8", Locale.RU),
        ("de-DE,de;q=0.9", Locale.EN),
        ("de;q=1.0, ru;q=0.5", Locale.RU),
        ("en;q=0.3, ru;q=0.7", Locale.RU),
        ("ru;q=0, en;q=0.1", Locale.EN),
        ("*", Locale.EN),
    ],
)
def test_parse_accept_language(header: str | None, expected: Locale) -> None:
    assert parse_accept_language(header) == expected
