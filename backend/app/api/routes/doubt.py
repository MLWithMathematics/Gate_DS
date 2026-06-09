from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
import logging

from app.schemas.schemas import DoubtRequest, DoubtResponse
from app.services.rag.rag_pipeline import rag_answer, rag_stream

router = APIRouter(prefix="/api/doubt", tags=["Doubt Solver"])
logger = logging.getLogger(__name__)


@router.post("", response_model=DoubtResponse)
async def ask_doubt(request: DoubtRequest):
    """Answer a doubt using RAG pipeline (non-streaming)."""
    clean_q = request.question.strip().replace("\x00", "")
    if len(clean_q) > 2000:
        raise HTTPException(status_code=400, detail="Question is too long")
    if not clean_q:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
        
    try:
        result = await rag_answer(
            question=clean_q,
            subject=request.subject.value if request.subject else None,
            mode=request.mode,
            chat_history=request.chat_history,
        )
        return DoubtResponse(
            answer=result["answer"],
            sources=result["sources"],
            cached=result["cached"],
            model_used=result["model_used"],
        )
    except Exception as e:
        logger.error(f"Doubt solver error: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")


@router.post("/stream")
async def stream_doubt(request: DoubtRequest):
    """Stream doubt answer using SSE."""
    clean_q = request.question.strip().replace("\x00", "")
    if len(clean_q) > 2000:
        raise HTTPException(status_code=400, detail="Question is too long")
    if not clean_q:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
        
    async def generate():
        try:
            async for token in rag_stream(
                question=clean_q,
                subject=request.subject.value if request.subject else None,
                mode=request.mode,
                chat_history=request.chat_history,
            ):
                # SSE format
                data = json.dumps({"token": token, "done": False})
                yield f"data: {data}\n\n"

            # Send done signal
            yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            error_data = json.dumps({"error": str(e), "done": True})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/explain-simple")
async def explain_simply(body: dict):
    """Get a simple, analogy-based explanation."""
    concept = body.get("concept", "")
    if not concept:
        raise HTTPException(status_code=400, detail="concept is required")
    try:
        result = await rag_answer(
            question=f"Explain '{concept}' using a simple everyday analogy. Under 150 words.",
            mode="simple",
        )
        return {"explanation": result["answer"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/follow-up")
async def get_follow_up(body: dict):
    """Generate follow-up questions for a topic."""
    topic = body.get("topic", "")
    subject = body.get("subject", "")
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")
    try:
        result = await rag_answer(
            question=f"Generate 5 important follow-up questions about '{topic}' in {subject} for GATE DS preparation. Format as a numbered list.",
            mode="detailed",
        )
        return {"questions": result["answer"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
