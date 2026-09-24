from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict


class Locale(StrEnum):
    EN = "en"
    RU = "ru"


DEFAULT_LOCALE = Locale.EN


class LocalizedText(BaseModel):
    """A machine code plus its per-locale human-readable text."""

    model_config = ConfigDict(frozen=True)

    code: str
    message: dict[str, str]

    def localize(self, locale: str, params: dict[str, Any] | None = None) -> str:
        """Render the text for a locale, falling back to the default locale."""
        template = self.message.get(locale) or self.message[DEFAULT_LOCALE.value]
        if not params:
            return template
        return template.format(**params)


class ErrorDefinition(LocalizedText):
    """Seed definition of an application error."""

    status_code: int


class SystemMessageDefinition(LocalizedText):
    """Seed definition of a non-error service text (e.g. system chat messages)."""
