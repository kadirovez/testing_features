from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import MEDIA_LIMIT, limiter
from app.modules.auth.dependencies import get_current_session
from app.modules.auth.schemas import CurrentSession
from app.modules.media import service as media_service
from app.modules.media.schemas import DownloadUrlRead, MediaRead, MediaVariant, UploadCreate, UploadRead

router = APIRouter(prefix="/media", tags=["media"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
CurrentDep = Annotated[CurrentSession, Depends(get_current_session)]


@router.post("/uploads", response_model=UploadRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(MEDIA_LIMIT)
async def create_upload(request: Request, data: UploadCreate, db: DbDep, current: CurrentDep) -> UploadRead:
    return await media_service.create_upload(db, current.user_id, data)


@router.put("/{media_id}/content", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(MEDIA_LIMIT)
async def upload_content(request: Request, media_id: UUID, db: DbDep, current: CurrentDep) -> None:
    body = await request.body()
    content_type = request.headers.get("content-type")
    await media_service.upload_pending_content(db, current.user_id, media_id, body, content_type)


@router.post("/{media_id}/complete", response_model=MediaRead)
@limiter.limit(MEDIA_LIMIT)
async def confirm_upload(request: Request, media_id: UUID, db: DbDep, current: CurrentDep) -> MediaRead:
    return await media_service.confirm_upload(db, current.user_id, media_id)


@router.get("/{media_id}", response_model=MediaRead)
async def get_media(media_id: UUID, db: DbDep, current: CurrentDep) -> MediaRead:
    return await media_service.get_media(db, current.user_id, media_id)


@router.get("/{media_id}/url", response_model=DownloadUrlRead)
@limiter.limit(MEDIA_LIMIT)
async def get_download_url(
    request: Request, media_id: UUID, db: DbDep, current: CurrentDep, variant: MediaVariant = MediaVariant.ORIGINAL
) -> DownloadUrlRead:
    return await media_service.get_download_url(db, current.user_id, media_id, variant)
