import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.i18n.locale import get_locale
from app.core.i18n.types import ErrorDefinition
from app.seed.errors.core import (
    INTERNAL_SERVER_ERROR,
    METHOD_NOT_ALLOWED,
    RATE_LIMIT_EXCEEDED,
    ROUTE_NOT_FOUND,
    VALIDATION_FAILED,
)

logger = logging.getLogger(__name__)

_STATUS_TO_ERROR: dict[int, ErrorDefinition] = {
    404: ROUTE_NOT_FOUND,
    405: METHOD_NOT_ALLOWED,
    429: RATE_LIMIT_EXCEEDED,
}


class AppError(Exception):
    """Application error carrying a seed `ErrorDefinition`; rendered by the global handler."""

    def __init__(self, error: ErrorDefinition, params: dict[str, Any] | None = None) -> None:
        super().__init__(error.code)
        self.error = error
        self.params = params or {}


def build_error_body(
    error: ErrorDefinition,
    locale: str,
    params: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the JSON error body in FastAPI `{"detail": ...}` format."""
    detail: dict[str, Any] = {"code": error.code, "message": error.localize(locale, params)}
    if extra:
        detail.update(extra)
    return {"detail": detail}


def error_response(
    request: Request,
    error: ErrorDefinition,
    params: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Render an `ErrorDefinition` as a localized JSON response."""
    return JSONResponse(
        status_code=error.status_code,
        content=build_error_body(error, get_locale(request), params, extra),
        headers=headers,
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(request, exc.error, exc.params)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    fields = [
        {"loc": list(item.get("loc", ())), "type": item.get("type"), "msg": item.get("msg")}
        for item in exc.errors()
    ]
    return error_response(request, VALIDATION_FAILED, extra={"errors": fields})


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    error = _STATUS_TO_ERROR.get(exc.status_code, INTERNAL_SERVER_ERROR)
    return error_response(request, error, headers=getattr(exc, "headers", None))


async def rate_limit_error_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = str(exc.limit.limit.get_expiry())
    return error_response(request, RATE_LIMIT_EXCEEDED, headers={"Retry-After": retry_after})


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Last-resort handler: log the traceback and never leak internals to the client.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return error_response(request, INTERNAL_SERVER_ERROR)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all global exception handlers to the application."""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
