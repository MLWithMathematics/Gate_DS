from supabase import create_client, Client
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

_supabase_client: Client | None = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL:
            raise RuntimeError("Supabase URL not configured")
            
        # Use service key if available to bypass RLS for server-side operations
        key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        if not key:
            raise RuntimeError("Supabase credentials not configured")
            
        _supabase_client = create_client(settings.SUPABASE_URL, key)
    return _supabase_client


async def check_db_health() -> bool:
    try:
        db = get_supabase()
        db.table("mcqs").select("id").limit(1).execute()
        return True
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        raise e


# ===== MCQ DB Operations =====

async def get_mcqs(
    subject: str | None = None,
    topic: str | None = None,
    difficulty: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict]:
    try:
        db = get_supabase()
        query = db.table("mcqs").select("*")
        if subject:
            query = query.ilike("subject", f"%{subject}%")
        if topic:
            query = query.ilike("topic", f"%{topic}%")
        if difficulty:
            query = query.eq("difficulty", difficulty)
        result = query.range(offset, offset + limit - 1).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching MCQs: {e}")
        return []


async def get_mcq_by_id(mcq_id: str) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("mcqs").select("*").eq("id", mcq_id).single().execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching MCQ {mcq_id}: {e}")
        return None


async def insert_mcq(mcq_data: dict) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("mcqs").insert(mcq_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error inserting MCQ: {e}")
        return None


async def update_mcq(mcq_id: str, mcq_data: dict) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("mcqs").update(mcq_data).eq("id", mcq_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error updating MCQ {mcq_id}: {e}")
        return None


async def delete_mcq(mcq_id: str) -> bool:
    try:
        db = get_supabase()
        db.table("mcqs").delete().eq("id", mcq_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error deleting MCQ {mcq_id}: {e}")
        return False


# ===== Progress DB Operations =====

async def get_user_progress(user_id: str) -> list[dict]:
    try:
        db = get_supabase()
        result = (
            db.table("progress")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching progress for {user_id}: {e}")
        return []


async def upsert_progress(user_id: str, subject: str, topic: str, correct: bool) -> dict | None:
    try:
        db = get_supabase()
        # Try to get existing record
        existing = (
            db.table("progress")
            .select("*")
            .eq("user_id", user_id)
            .eq("subject", subject)
            .eq("topic", topic)
            .execute()
        )

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        if existing.data:
            record = existing.data[0]
            new_attempts = record["attempts"] + 1
            new_accuracy = (
                (record["accuracy"] * record["attempts"] + (100 if correct else 0))
                / new_attempts
            )
            result = (
                db.table("progress")
                .update({
                    "attempts": new_attempts,
                    "accuracy": round(new_accuracy, 2),
                    "last_attempt": now,
                })
                .eq("id", record["id"])
                .execute()
            )
        else:
            result = (
                db.table("progress")
                .insert({
                    "user_id": user_id,
                    "subject": subject,
                    "topic": topic,
                    "accuracy": 100.0 if correct else 0.0,
                    "attempts": 1,
                    "last_attempt": now,
                })
                .execute()
            )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error upserting progress: {e}")
        return None


async def upsert_mcq_attempt(user_id: str, mcq_id: str, correct: bool) -> dict | None:
    try:
        db = get_supabase()
        result = (
            db.table("user_mcq_attempts")
            .upsert({
                "user_id": user_id,
                "mcq_id": mcq_id,
                "correct": correct,
            })
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error upserting MCQ attempt: {e}")
        return None


async def get_mcq_attempts(user_id: str) -> dict:
    """Returns a dict mapping mcq_id -> correct."""
    try:
        db = get_supabase()
        result = (
            db.table("user_mcq_attempts")
            .select("mcq_id, correct")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return {row["mcq_id"]: row["correct"] for row in result.data}
        return {}
    except Exception as e:
        logger.error(f"Error fetching MCQ attempts for {user_id}: {e}")
        return {}


async def get_flashcards(user_id: str, limit: int = 20) -> list[dict]:
    """Fetch MCQs that the user previously got wrong for review."""
    try:
        db = get_supabase()
        # Fetch wrong attempts
        wrong_attempts = (
            db.table("user_mcq_attempts")
            .select("mcq_id")
            .eq("user_id", user_id)
            .eq("correct", False)
            .limit(limit * 2) # Fetch extra in case some were deleted
            .execute()
        )
        if not wrong_attempts.data:
            return []
            
        mcq_ids = [row["mcq_id"] for row in wrong_attempts.data]
        if not mcq_ids:
            return []
            
        # Fetch the actual questions
        mcqs_result = db.table("mcqs").select("*").in_("id", mcq_ids).limit(limit).execute()
        return mcqs_result.data or []
    except Exception as e:
        logger.error(f"Error fetching flashcards for {user_id}: {e}")
        return []


# ===== Mock Test DB Operations =====

async def save_mock_test_result(result_data: dict) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("mock_tests").insert(result_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error saving mock test result: {e}")
        return None


async def get_mock_test_history(user_id: str, limit: int = 10) -> list[dict]:
    try:
        db = get_supabase()
        result = (
            db.table("mock_tests")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching test history: {e}")
        return []


# ===== Study Plan Operations =====

async def upsert_study_plan(user_id: str, plan_text: str) -> dict | None:
    try:
        db = get_supabase()
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if plan exists
        existing = db.table("study_plans").select("id").eq("user_id", user_id).execute()
        if existing.data:
            result = db.table("study_plans").update({
                "plan_text": plan_text,
                "updated_at": now
            }).eq("user_id", user_id).execute()
        else:
            result = db.table("study_plans").insert({
                "user_id": user_id,
                "plan_text": plan_text,
                "updated_at": now
            }).execute()
            
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error upserting study plan for {user_id}: {e}")
        return None

async def get_study_plan(user_id: str) -> dict | None:
    try:
        db = get_supabase()
        result = (
            db.table("study_plans")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error fetching study plan for {user_id}: {e}")
        return None


# ===== Chat Cache Operations =====

async def get_cached_response(query_hash: str) -> str | None:
    try:
        db = get_supabase()
        result = (
            db.table("chat_cache")
            .select("response")
            .eq("query_hash", query_hash)
            .execute()
        )
        return result.data[0]["response"] if result.data else None
    except Exception as e:
        logger.warning(f"Cache miss for {query_hash}: {e}")
        return None


async def cache_response(query_hash: str, response: str) -> None:
    try:
        db = get_supabase()
        db.table("chat_cache").upsert({
            "query_hash": query_hash,
            "response": response,
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to cache response: {e}")


# ===== Syllabus / Vector Operations =====

async def get_similar_chunks(
    embedding: list[float], top_k: int = 5, subject: str | None = None
) -> list[dict]:
    """Query Supabase pgvector for similar chunks."""
    try:
        db = get_supabase()
        # Use Supabase RPC for vector similarity search
        params = {
            "query_embedding": embedding,
            "match_count": top_k,
        }
        if subject:
            params["filter_subject"] = subject

        result = db.rpc("match_syllabus_chunks", params).execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Error querying vector store: {e}")
        return []


async def insert_syllabus_chunk(chunk_data: dict) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("syllabus_chunks").insert(chunk_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error inserting syllabus chunk: {e}")
        return None


# ===== User Operations =====

async def get_user_by_email(email: str) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("users").select("*").eq("email", email).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error fetching user by email: {e}")
        return None


async def get_user_by_id(user_id: str) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return None


async def create_user(user_data: dict) -> dict | None:
    try:
        db = get_supabase()
        result = db.table("users").insert(user_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return None


async def update_user_xp(user_id: str, xp_delta: int) -> None:
    """Legacy wrapper — prefer update_user_stats for full tracking."""
    await update_user_stats(user_id=user_id, xp_delta=xp_delta)


async def update_user_stats(
    user_id: str,
    xp_delta: int,
    correct_count: int = 0,
    attempt_count: int = 0,
) -> None:
    """Update user XP, accuracy, weekly XP (auto-reset), streak, and level.
    
    Called after every MCQ submission and mock test submission.
    Handles:
    - XP & total_score accumulation
    - Level calculation (1 level per 1000 XP)
    - Accuracy stats (total_correct / total_attempted)
    - Weekly XP with auto-reset on new ISO week (Monday)
    - Daily streak tracking (increment if consecutive, reset if gap)
    """
    try:
        db = get_supabase()
        user = await get_user_by_id(user_id)
        if not user:
            return

        from datetime import date, timedelta
        today = date.today()

        # --- XP & Level ---
        new_xp = user.get("xp", 0) + xp_delta
        new_level = max(1, new_xp // 1000 + 1)
        new_total_score = user.get("total_score", 0) + xp_delta

        # --- Accuracy stats ---
        new_correct = user.get("total_correct", 0) + correct_count
        new_attempted = user.get("total_attempted", 0) + attempt_count

        # --- Weekly XP (auto-reset on new ISO week) ---
        current_monday = today - timedelta(days=today.weekday())
        user_week_start = user.get("week_start")
        if user_week_start:
            if isinstance(user_week_start, str):
                user_week_start = date.fromisoformat(user_week_start)
        
        if user_week_start and user_week_start >= current_monday:
            # Same week — accumulate
            new_weekly_xp = user.get("weekly_xp", 0) + xp_delta
        else:
            # New week — reset and start fresh
            new_weekly_xp = xp_delta

        # --- Streak ---
        last_active = user.get("last_active_date")
        if last_active:
            if isinstance(last_active, str):
                last_active = date.fromisoformat(last_active)

        current_streak = user.get("streak", 0)
        if last_active == today:
            # Already active today — don't double-count
            new_streak = current_streak
        elif last_active and (today - last_active).days == 1:
            # Active yesterday — streak continues!
            new_streak = current_streak + 1
        else:
            # First activity or missed a day — start fresh
            new_streak = 1

        # --- Single atomic update ---
        db.table("users").update({
            "xp": new_xp,
            "level": new_level,
            "total_score": new_total_score,
            "total_correct": new_correct,
            "total_attempted": new_attempted,
            "weekly_xp": new_weekly_xp,
            "week_start": current_monday.isoformat(),
            "streak": new_streak,
            "last_active_date": today.isoformat(),
        }).eq("id", user_id).execute()

    except Exception as e:
        logger.error(f"Error updating user stats: {e}")


# ===== Leaderboard =====

async def get_leaderboard(limit: int = 20, period: str = "weekly") -> list[dict]:
    """Get leaderboard sorted by weekly or all-time score."""
    try:
        db = get_supabase()
        order_col = "weekly_xp" if period == "weekly" else "total_score"
        result = (
            db.table("users")
            .select("id, name, total_score, streak, xp, level, weekly_xp, total_correct, total_attempted")
            .order(order_col, desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching leaderboard: {e}")
        return []


# ===== Bookmarks =====

async def toggle_bookmark(user_id: str, mcq_id: str) -> bool:
    """Toggles bookmark status. Returns True if bookmarked, False if unbookmarked."""
    try:
        db = get_supabase()
        existing = db.table("bookmarks").select("*").eq("user_id", user_id).eq("mcq_id", mcq_id).execute()
        if existing.data:
            db.table("bookmarks").delete().eq("user_id", user_id).eq("mcq_id", mcq_id).execute()
            return False
        else:
            db.table("bookmarks").insert({"user_id": user_id, "mcq_id": mcq_id}).execute()
            return True
    except Exception as e:
        logger.error(f"Error toggling bookmark: {e}")
        return False


async def get_bookmarked_ids(user_id: str) -> list[str]:
    try:
        db = get_supabase()
        bookmarks = db.table("bookmarks").select("mcq_id").eq("user_id", user_id).execute()
        if not bookmarks.data:
            return []
        return [b["mcq_id"] for b in bookmarks.data]
    except Exception as e:
        logger.error(f"Error fetching bookmarked ids: {e}")
        return []


async def get_bookmarked_mcqs(user_id: str) -> list[dict]:
    try:
        db = get_supabase()
        bookmarks = db.table("bookmarks").select("mcq_id").eq("user_id", user_id).order("created_at", desc=True).execute()
        if not bookmarks.data:
            return []
        
        mcq_ids = [b["mcq_id"] for b in bookmarks.data]
        if not mcq_ids:
            return []
            
        mcqs_result = db.table("mcqs").select("*").in_("id", mcq_ids).execute()
        
        # Sort them in the order they were bookmarked (newest first)
        mcq_dict = {m["id"]: m for m in mcqs_result.data or []}
        return [mcq_dict[m_id] for m_id in mcq_ids if m_id in mcq_dict]
    except Exception as e:
        logger.error(f"Error fetching bookmarks: {e}")
        return []
