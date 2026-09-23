import hashlib
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import settings

_password_hasher = PasswordHasher()


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


class TokenError(Exception):
    """Base class for token decoding failures."""


class TokenExpiredError(TokenError):
    """Token signature is valid but it has expired."""


class TokenInvalidError(TokenError):
    """Token is malformed, has a bad signature or an unexpected type."""


def hash_password(password: str) -> str:
    """Hash a plaintext password with argon2."""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Check a plaintext password against a stored argon2 hash."""
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def hash_token(token: str) -> str:
    """Hash a high-entropy token for storage (sha256 is sufficient here)."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: UUID, session_id: UUID) -> str:
    """Issue a short-lived access JWT bound to a session."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "typ": TokenType.ACCESS.value,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(session_id: UUID, expires_at: datetime) -> str:
    """Issue a refresh JWT for a session; `jti` makes every rotated token unique."""
    payload = {
        "sid": str(session_id),
        "typ": TokenType.REFRESH.value,
        "jti": uuid4().hex,
        "iat": datetime.now(UTC),
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    """Decode and validate a JWT, ensuring it has the expected token type."""
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError from exc
    except jwt.PyJWTError as exc:
        raise TokenInvalidError from exc

    if claims.get("typ") != expected_type.value or "sid" not in claims:
        raise TokenInvalidError
    if expected_type == TokenType.ACCESS and "sub" not in claims:
        raise TokenInvalidError
    try:
        UUID(claims["sid"])
        if "sub" in claims:
            UUID(claims["sub"])
    except (TypeError, ValueError) as exc:
        raise TokenInvalidError from exc
    return claims
