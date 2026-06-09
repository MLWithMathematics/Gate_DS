from fastapi import APIRouter, HTTPException
from typing import List
import logging

from app.schemas.schemas import MCQResponse
from app.services.db.supabase_service import get_flashcards

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])
logger = logging.getLogger(__name__)


@router.get("/{user_id}", response_model=List[MCQResponse])
async def get_daily_flashcards(user_id: str, limit: int = 20):
    """Get flashcards for the user based on previous mistakes."""
    try:
        mcqs = await get_flashcards(user_id, limit=limit)
        return mcqs
    except Exception as e:
        logger.error(f"Error getting flashcards for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch flashcards")
