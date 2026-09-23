from fastapi import APIRouter, WebSocket

from app.modules.realtime import service as realtime_service

router = APIRouter(tags=["realtime"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None, lang: str | None = None) -> None:
    await realtime_service.handle_connection(websocket, token, lang)
