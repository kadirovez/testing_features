import io
import json
import subprocess
from dataclasses import dataclass

from PIL import Image, ImageOps

from app.core.config import settings

_FFPROBE_TIMEOUT_SECONDS = 30
_FFMPEG_TIMEOUT_SECONDS = 60


@dataclass(frozen=True)
class ProcessedMedia:
    """Result of synchronous media processing."""

    width: int | None
    height: int | None
    duration_ms: int | None
    thumbnail_jpeg: bytes


def _square_crop(image: Image.Image) -> Image.Image:
    """Center-crop to a 1:1 aspect ratio."""
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    return image.crop((left, top, left + side, top + side))


def _thumbnail_from_image(image: Image.Image, square: bool = False) -> bytes:
    image = ImageOps.exif_transpose(image)
    if square:
        image = _square_crop(image)
    image.thumbnail((settings.MEDIA_THUMBNAIL_SIZE, settings.MEDIA_THUMBNAIL_SIZE))
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=80)
    return buffer.getvalue()


def process_photo(path: str, square_crop: bool = False) -> ProcessedMedia:
    """Read photo dimensions and render a JPEG thumbnail."""
    with Image.open(path) as image:
        oriented = ImageOps.exif_transpose(image)
        if square_crop:
            oriented = _square_crop(oriented)
        width, height = oriented.size
        return ProcessedMedia(
            width=width,
            height=height,
            duration_ms=None,
            thumbnail_jpeg=_thumbnail_from_image(oriented, square=False),
        )


def process_video(path: str) -> ProcessedMedia:
    """Probe video metadata with ffprobe and grab a frame with ffmpeg as the thumbnail."""
    probe = subprocess.run(
        [
            settings.FFPROBE_BINARY,
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height:format=duration",
            "-of", "json",
            path,
        ],
        capture_output=True,
        check=True,
        timeout=_FFPROBE_TIMEOUT_SECONDS,
    )
    info = json.loads(probe.stdout or b"{}")
    stream = (info.get("streams") or [{}])[0]
    duration = info.get("format", {}).get("duration")
    duration_ms = int(float(duration) * 1000) if duration else None
    seek_seconds = "1" if duration_ms and duration_ms > 1000 else "0"

    frame = subprocess.run(
        [
            settings.FFMPEG_BINARY,
            "-v", "error",
            "-ss", seek_seconds,
            "-i", path,
            "-frames:v", "1",
            "-f", "image2pipe",
            "-vcodec", "png",
            "-",
        ],
        capture_output=True,
        check=True,
        timeout=_FFMPEG_TIMEOUT_SECONDS,
    )
    with Image.open(io.BytesIO(frame.stdout)) as image:
        thumbnail = _thumbnail_from_image(image)
    return ProcessedMedia(
        width=stream.get("width"),
        height=stream.get("height"),
        duration_ms=duration_ms,
        thumbnail_jpeg=thumbnail,
    )
