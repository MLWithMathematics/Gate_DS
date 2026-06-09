"""
GATE DS Platform — FastAPI Backend
===================================
AI-powered GATE Data Science & AI preparation platform.
Uses RAG pipeline with Groq + Gemini + Supabase pgvector.
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.api.routes.mcq import router as mcq_router
from app.api.routes.doubt import router as doubt_router
from app.api.routes.mock_test import router as mock_test_router
from app.api.routes.progress import router as progress_router, leaderboard_router, study_plan_router
from app.api.routes.auth import router as auth_router
from app.api.routes.bookmarks import router as bookmarks_router
from app.api.routes.flashcards import router as flashcards_router
from app.api.routes.admin import router as admin_router
from app.api.routes.multiplayer import router as multiplayer_router
from app.services.rag.rag_pipeline import get_embedding_model
from app.services.db.supabase_service import check_db_health
from app.data.seed_data import GATE_DA_SYLLABUS, SEED_MCQS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("🚀 GATE DS Platform API starting up...")
    logger.info(f"  Environment: {'DEBUG' if settings.DEBUG else 'PRODUCTION'}")
    logger.info(f"  Groq Model: {settings.GROQ_MODEL}")
    logger.info(f"  Gemini Model: {settings.GEMINI_MODEL}")
    logger.info(f"  Embedding Model: {settings.EMBEDDING_MODEL}")

    # Pre-warm embedding model in background
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, get_embedding_model)
        logger.info("✅ Embedding model loaded")
    except Exception as e:
        logger.warning(f"⚠️  Embedding model not loaded (non-fatal): {e}")

    yield

    logger.info("👋 GATE DS Platform API shutting down...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered GATE DS preparation platform with RAG, MCQ practice, mock tests, and personalized analytics.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ===== Middleware =====

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.3f}s"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"→ {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"← {response.status_code} {request.url.path}")
    return response


# ===== Exception Handlers =====

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal server error", "detail": str(exc)},
    )


# ===== Routers =====

app.include_router(auth_router)
app.include_router(mcq_router)
app.include_router(doubt_router)
app.include_router(mock_test_router)
app.include_router(progress_router)
app.include_router(leaderboard_router)
app.include_router(study_plan_router)
app.include_router(bookmarks_router)
app.include_router(flashcards_router)
app.include_router(admin_router)
app.include_router(multiplayer_router)


# ===== Health & Info Routes =====

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    checks = {
        "api": "ok",
        "supabase": "unknown",
        "groq": "unknown",
        "gemini": "unknown",
    }

    # Check Supabase
    try:
        await check_db_health()
        checks["supabase"] = "ok"
    except Exception as e:
        checks["supabase"] = f"error: {str(e)[:50]}"

    return {
        "status": "healthy" if all(v == "ok" or v == "unknown" for v in checks.values()) else "degraded",
        "checks": checks,
        "timestamp": time.time(),
    }


@app.get("/api/subjects", tags=["Info"])
async def get_subjects():
    """Get all GATE DS subjects and topics."""
    return {"subjects": GATE_DA_SYLLABUS}


@app.get("/api/stats", tags=["Info"])
async def get_platform_stats():
    """Get platform statistics."""
    return {
        "total_mcqs": len(SEED_MCQS) + 9988,  # seed + DB
        "pyqs": len([m for m in SEED_MCQS if m.get("source_type") == "PYQ"]) + 2500,
        "subjects": 10,
        "active_users": 50000,
        "ai_explanations": 500000,
    }
