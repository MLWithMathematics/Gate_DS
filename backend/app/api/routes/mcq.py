from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
import json
import uuid
import logging

from app.schemas.schemas import (
    MCQResponse, MCQGenerateRequest, MCQSubmitRequest, MCQSubmitResponse,
    DoubtRequest, DoubtResponse, APIResponse,
)
from app.services.db.supabase_service import (
    get_mcqs, get_mcq_by_id, insert_mcq, upsert_progress, update_user_stats,
    upsert_mcq_attempt, get_mcq_attempts,
)
from app.services.rag.rag_pipeline import generate_mcqs_with_ai
from app.data.seed_data import SEED_MCQS

router = APIRouter(prefix="/api/mcq", tags=["MCQ"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[MCQResponse])
async def list_mcqs(
    subject: str | None = Query(None),
    topic: str | None = Query(None),
    difficulty: str | None = Query(None),
    source_type: str | None = Query(None),
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    """List MCQs with optional filtering."""
    try:
        # Try Supabase first, fall back to seed data
        mcqs = await get_mcqs(subject=subject, topic=topic, difficulty=difficulty, limit=limit, offset=offset)
        
        seed = SEED_MCQS
        if subject:
            seed = [m for m in seed if m["subject"] == subject]
        if topic:
            seed = [m for m in seed if m["topic"] == topic]
        if difficulty:
            seed = [m for m in seed if m["difficulty"] == difficulty]
            
        existing_ids = {m["id"] for m in mcqs}
        for s in seed:
            if s["id"] not in existing_ids:
                mcqs.append(s)
                
        return mcqs[offset : offset + limit]
    except Exception as e:
        logger.error(f"Error listing MCQs: {e}")
        # Return seed data as fallback
        return SEED_MCQS[:limit]


@router.get("/random", response_model=MCQResponse)
async def get_random_mcq(
    subject: str | None = Query(None),
    difficulty: str | None = Query(None),
):
    """Get a single random MCQ."""
    import random
    seed = SEED_MCQS
    if subject:
        seed = [m for m in seed if m["subject"] == subject]
    if difficulty:
        seed = [m for m in seed if m["difficulty"] == difficulty]
    if not seed:
        raise HTTPException(status_code=404, detail="No MCQs found with given filters")
    return random.choice(seed)


@router.get("/{mcq_id}", response_model=MCQResponse)
async def get_mcq(mcq_id: str):
    """Get a specific MCQ by ID."""
    # Check seed data first
    seed_match = next((m for m in SEED_MCQS if m["id"] == mcq_id), None)
    if seed_match:
        return seed_match
    mcq = await get_mcq_by_id(mcq_id)
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")
    return mcq


@router.get("/{mcq_id}/explain")
async def get_explanation(mcq_id: str):
    """Get detailed explanation for an MCQ."""
    seed_match = next((m for m in SEED_MCQS if m["id"] == mcq_id), None)
    if seed_match:
        return {"explanation": seed_match["explanation"]}
    mcq = await get_mcq_by_id(mcq_id)
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")
    return {"explanation": mcq["explanation"]}


@router.post("/submit", response_model=MCQSubmitResponse)
async def submit_answer(request: MCQSubmitRequest):
    """Submit an MCQ answer and update progress.
    
    Checks server-side attempt history to prevent duplicate XP:
    - New attempt correct: +10 XP
    - New attempt wrong: +2 XP  
    - Correction (was wrong, now correct): +8 XP
    - Already correct: 0 XP
    - Still wrong: 0 XP
    """
    # Find MCQ
    mcq = next((m for m in SEED_MCQS if m["id"] == request.mcq_id), None)
    if not mcq:
        mcq = await get_mcq_by_id(request.mcq_id)
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ not found")

    correct = request.answer == mcq["answer"]
    already_attempted = False
    xp_earned = 0

    try:
        # Check existing attempt history from DB
        existing_attempts = await get_mcq_attempts(request.user_id)
        past_result = existing_attempts.get(request.mcq_id)

        if past_result is None:
            # First time attempting this MCQ
            xp_earned = 10 if correct else 2
        elif past_result is True:
            # Already solved correctly — no more XP
            already_attempted = True
            xp_earned = 0
        elif past_result is False and correct:
            # Correction: was wrong, now correct
            xp_earned = 8
        else:
            # Still wrong on re-attempt — no XP
            already_attempted = True
            xp_earned = 0

        # Always record/update the attempt
        await upsert_mcq_attempt(
            user_id=request.user_id,
            mcq_id=request.mcq_id,
            correct=correct,
        )

        # Update topic-level progress only for new attempts or corrections
        if not already_attempted:
            await upsert_progress(
                user_id=request.user_id,
                subject=mcq["subject"],
                topic=mcq["topic"],
                correct=correct,
            )

        # Award XP and update stats (accuracy, streak, weekly)
        if xp_earned > 0:
            await update_user_stats(
                user_id=request.user_id,
                xp_delta=xp_earned,
                correct_count=1 if correct else 0,
                attempt_count=1 if not already_attempted else 0,
            )
    except Exception as e:
        logger.warning(f"Progress update failed: {e}")
        # Fallback: give XP to not punish user for DB errors
        xp_earned = 10 if correct else 2

    return MCQSubmitResponse(
        correct=correct,
        correct_answer=mcq["answer"],
        explanation=mcq["explanation"],
        xp_earned=xp_earned,
        already_attempted=already_attempted,
    )


@router.post("/generate", response_model=list[dict])
async def generate_mcqs(request: MCQGenerateRequest):
    """Generate new MCQs using AI (Gemini)."""
    try:
        mcqs = await generate_mcqs_with_ai(
            subject=request.subject.value,
            topic=request.topic,
            difficulty=request.difficulty.value,
            count=request.count,
        )
        if not mcqs:
            raise HTTPException(status_code=503, detail="AI generation temporarily unavailable")

        # Add IDs and save to DB
        for mcq in mcqs:
            mcq["id"] = str(uuid.uuid4())
            await insert_mcq(mcq)

        return mcqs
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MCQ generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pyq/list")
async def list_pyqs(
    subject: str | None = Query(None),
    year: int | None = Query(None),
    limit: int = Query(default=20, ge=1, le=50),
):
    """List previous year questions."""
    pyqs = [m for m in SEED_MCQS if m.get("source_type") == "PYQ"]
    if subject:
        pyqs = [m for m in pyqs if m["subject"] == subject]
    if year:
        pyqs = [m for m in pyqs if m.get("year") == year]
    return pyqs[:limit]
