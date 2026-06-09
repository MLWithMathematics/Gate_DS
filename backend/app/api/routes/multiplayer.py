from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
from app.services.multiplayer_manager import manager

router = APIRouter(prefix="/api/multiplayer", tags=["Multiplayer"])
logger = logging.getLogger(__name__)

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, name: str = "Player"):
    await manager.connect(websocket, user_id, name)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "submit_answer":
                await manager.handle_answer(user_id, data.get("mcq_id"), data.get("answer"))
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(user_id)
