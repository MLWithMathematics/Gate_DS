from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import logging

from app.schemas.schemas import MCQResponse, APIResponse
from app.services.db.supabase_service import (
    get_bookmarked_mcqs,
    get_bookmarked_ids,
    toggle_bookmark
)

router = APIRouter(prefix="/api/bookmarks", tags=["Bookmarks"])
logger = logging.getLogger(__name__)


@router.get("/{user_id}", response_model=List[MCQResponse])
async def get_bookmarks(user_id: str):
    """Get all bookmarked MCQs for a user."""
    try:
        mcqs = await get_bookmarked_mcqs(user_id)
        for mcq in mcqs:
            mcq["bookmarked"] = True
        return mcqs
    except Exception as e:
        logger.error(f"Error getting bookmarks for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch bookmarks")


@router.get("/{user_id}/ids", response_model=List[str])
async def get_bookmark_ids(user_id: str):
    """Get just the IDs of bookmarked MCQs."""
    try:
        return await get_bookmarked_ids(user_id)
    except Exception as e:
        logger.error(f"Error getting bookmark ids for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch bookmark ids")


@router.post("/{user_id}/{mcq_id}")
async def toggle_user_bookmark(user_id: str, mcq_id: str):
    """Toggle a bookmark on or off."""
    try:
        is_bookmarked = await toggle_bookmark(user_id, mcq_id)
        return {"status": "success", "bookmarked": is_bookmarked}
    except Exception as e:
        logger.error(f"Error toggling bookmark for {user_id}/{mcq_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle bookmark")
