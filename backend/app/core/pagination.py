import base64
import binascii
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.exceptions import AppError
from app.seed.errors.core import INVALID_CURSOR

_SEPARATOR = "|"


class Page[T](BaseModel):
    """Cursor-paginated list response."""

    items: list[T]
    next_cursor: str | None = None


def encode_cursor(sort_value: str | datetime, item_id: UUID) -> str:
    """Encode a (sort value, id) keyset position into an opaque cursor."""
    raw_value = sort_value.isoformat() if isinstance(sort_value, datetime) else sort_value
    raw = f"{raw_value}{_SEPARATOR}{item_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[str, UUID]:
    """Decode an opaque cursor into its (sort value, id) keyset position."""
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        sort_value, _, raw_id = raw.rpartition(_SEPARATOR)
        return sort_value, UUID(raw_id)
    except (binascii.Error, UnicodeDecodeError, ValueError) as exc:
        raise AppError(INVALID_CURSOR) from exc


def decode_datetime_cursor(cursor: str) -> tuple[datetime, UUID]:
    """Decode a cursor whose sort value is an ISO datetime."""
    sort_value, item_id = decode_cursor(cursor)
    try:
        return datetime.fromisoformat(sort_value), item_id
    except ValueError as exc:
        raise AppError(INVALID_CURSOR) from exc
