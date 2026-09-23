from typing import Any

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings

_session = aioboto3.Session(
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
    region_name=settings.S3_REGION,
)
_client_config = Config(signature_version="s3v4", s3={"addressing_style": "path"})
_NOT_FOUND_CODES = {"404", "NoSuchKey", "NotFound"}


def _client(public: bool = False) -> Any:
    """Create an S3 client; `public=True` signs URLs against the client-facing endpoint."""
    endpoint = settings.S3_PUBLIC_ENDPOINT_URL if public and settings.S3_PUBLIC_ENDPOINT_URL else settings.S3_ENDPOINT_URL
    return _session.client("s3", endpoint_url=endpoint, config=_client_config)


async def ensure_bucket() -> None:
    """Create the media bucket if it does not exist yet."""
    async with _client() as s3:
        try:
            await s3.head_bucket(Bucket=settings.S3_BUCKET)
        except ClientError:
            await s3.create_bucket(Bucket=settings.S3_BUCKET)


async def generate_presigned_upload(key: str, content_type: str, max_size: int) -> dict[str, Any]:
    """Generate a presigned POST (URL + form fields) enforcing content type and max size."""
    async with _client(public=True) as s3:
        return await s3.generate_presigned_post(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[{"Content-Type": content_type}, ["content-length-range", 1, max_size]],
            ExpiresIn=settings.S3_PRESIGNED_UPLOAD_TTL_SECONDS,
        )


async def generate_presigned_download(key: str) -> str:
    """Generate a presigned GET URL for an object."""
    async with _client(public=True) as s3:
        return await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": key},
            ExpiresIn=settings.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS,
        )


async def head_object(key: str) -> dict[str, Any] | None:
    """Return object metadata or None when the object does not exist."""
    async with _client() as s3:
        try:
            return await s3.head_object(Bucket=settings.S3_BUCKET, Key=key)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in _NOT_FOUND_CODES:
                return None
            raise


async def download_file(key: str, path: str) -> None:
    """Download an object to a local file."""
    async with _client() as s3:
        await s3.download_file(settings.S3_BUCKET, key, path)


async def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    """Upload raw bytes as an object."""
    async with _client() as s3:
        await s3.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=data, ContentType=content_type)


async def delete_object(key: str) -> None:
    """Delete an object (used only for never-attached stale uploads)."""
    async with _client() as s3:
        await s3.delete_object(Bucket=settings.S3_BUCKET, Key=key)
