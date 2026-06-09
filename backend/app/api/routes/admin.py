from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import logging
from pydantic import BaseModel

from app.api.routes.auth import require_admin
from app.services.db.supabase_service import (
    get_mcqs, get_mcq_by_id, insert_mcq, update_mcq, delete_mcq, insert_syllabus_chunk
)
from app.schemas.schemas import SyllabusChunkCreate
from app.services.rag.rag_pipeline import get_embedding_model

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])
logger = logging.getLogger(__name__)


class MCQCreate(BaseModel):
    subject: str
    topic: str
    difficulty: str
    question: str
    answer: str
    options: list[dict]
    explanation: str
    source_type: str = "Generated"
    year: Optional[int] = None
    tags: Optional[list[str]] = []


class MCQUpdate(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    options: Optional[list[dict]] = None
    explanation: Optional[str] = None
    source_type: Optional[str] = None
    year: Optional[int] = None
    tags: Optional[list[str]] = None


@router.get("/mcqs")
async def admin_get_mcqs(limit: int = 50, offset: int = 0):
    """Admin: Get all MCQs."""
    try:
        mcqs = await get_mcqs(limit=limit, offset=offset)
        return mcqs
    except Exception as e:
        logger.error(f"Error fetching MCQs for admin: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch MCQs")


@router.post("/mcqs")
async def admin_create_mcq(mcq: MCQCreate):
    """Admin: Create an MCQ."""
    try:
        new_mcq = await insert_mcq(mcq.dict())
        if not new_mcq:
            raise HTTPException(status_code=400, detail="Failed to create MCQ")
        return new_mcq
    except Exception as e:
        logger.error(f"Error creating MCQ: {e}")
        raise HTTPException(status_code=500, detail="Failed to create MCQ")


@router.patch("/mcqs/{mcq_id}")
async def admin_update_mcq(mcq_id: str, updates: MCQUpdate):
    """Admin: Update an MCQ."""
    try:
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        updated_mcq = await update_mcq(mcq_id, update_data)
        if not updated_mcq:
            raise HTTPException(status_code=404, detail="MCQ not found or update failed")
        return updated_mcq
    except Exception as e:
        logger.error(f"Error updating MCQ: {e}")
        raise HTTPException(status_code=500, detail="Failed to update MCQ")


@router.delete("/mcqs/{mcq_id}")
async def admin_delete_mcq(mcq_id: str):
    """Admin: Delete an MCQ."""
    try:
        success = await delete_mcq(mcq_id)
        if not success:
            raise HTTPException(status_code=404, detail="MCQ not found or delete failed")
        return {"status": "success", "message": "MCQ deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting MCQ: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete MCQ")


@router.post("/syllabus")
async def admin_create_syllabus(chunk: SyllabusChunkCreate):
    """Admin: Add a new syllabus topic/chunk."""
    try:
        # Generate embedding for the RAG pipeline
        model = get_embedding_model()
        embedding = model.encode(chunk.content, normalize_embeddings=True).tolist()
        
        import uuid
        chunk_data = chunk.dict()
        chunk_data["id"] = str(uuid.uuid4())
        chunk_data["embedding"] = embedding
        
        new_chunk = await insert_syllabus_chunk(chunk_data)
        if not new_chunk:
            raise HTTPException(status_code=400, detail="Failed to create syllabus chunk")
        
        # Don't return the huge embedding vector
        del new_chunk["embedding"]
        return new_chunk
    except Exception as e:
        logger.error(f"Error creating syllabus chunk: {e}")
        raise HTTPException(status_code=500, detail="Failed to create syllabus chunk")
