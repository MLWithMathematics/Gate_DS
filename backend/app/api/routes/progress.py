from fastapi import APIRouter, HTTPException
import logging
from datetime import datetime, timezone, timedelta

from app.schemas.schemas import (
    ProgressUpdate, UserProgressResponse, SubjectProgressResponse,
    StudyPlanRequest, StudyPlanResponse, LeaderboardResponse, LeaderboardEntry,
)
from app.services.db.supabase_service import (
    get_user_progress, upsert_progress, get_user_by_id, get_leaderboard, get_mcq_attempts
)
from app.services.rag.rag_pipeline import generate_study_plan

router = APIRouter(prefix="/api/progress", tags=["Progress"])
logger = logging.getLogger(__name__)


@router.get("/{user_id}", response_model=UserProgressResponse)
async def get_user_analytics(user_id: str):
    """Get comprehensive user progress analytics."""
    try:
        progress_records = await get_user_progress(user_id)
        user = await get_user_by_id(user_id)
        attempted_mcqs = await get_mcq_attempts(user_id)

        # Group by subject
        subject_map: dict = {}
        for record in progress_records:
            subj = record["subject"]
            topic = record["topic"]
            if subj not in subject_map:
                subject_map[subj] = {
                    "subject": subj,
                    "accuracy": 0,
                    "attempts": 0,
                    "mastery": 0,
                    "last_attempt": None,
                    "topics": [],
                }
            subject_map[subj]["topics"].append({
                "topic": topic,
                "accuracy": record["accuracy"],
                "attempts": record["attempts"],
                "mastery": min(100, record["accuracy"]),
            })
            subject_map[subj]["attempts"] += record["attempts"]
            subject_map[subj]["last_attempt"] = record.get("last_attempt")

        # Calculate per-subject average accuracy
        for subj_data in subject_map.values():
            if subj_data["topics"]:
                subj_data["accuracy"] = round(
                    sum(t["accuracy"] for t in subj_data["topics"]) / len(subj_data["topics"]), 1
                )
                subj_data["mastery"] = subj_data["accuracy"]

        subject_progress = list(subject_map.values())

        # Generate weekly stats (last 8 weeks)
        weekly_stats = _generate_weekly_stats(progress_records)

        # Generate daily progress (last 30 days)
        daily_progress = _generate_daily_progress(progress_records)

        return UserProgressResponse(
            subject_progress=subject_progress,
            weekly_stats=weekly_stats,
            daily_progress=daily_progress,
            attempted_mcqs=attempted_mcqs,
            streak=user.get("streak", 0) if user else 0,
            total_xp=user.get("xp", 0) if user else 0,
        )
    except Exception as e:
        logger.error(f"Analytics error for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update")
async def update_progress(request: ProgressUpdate):
    """Update user progress after answering a question."""
    try:
        result = await upsert_progress(
            user_id=request.user_id,
            subject=request.subject.value,
            topic=request.topic,
            correct=request.correct,
        )
        return {"status": "updated", "data": result}
    except Exception as e:
        logger.error(f"Progress update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weak-areas/{user_id}")
async def get_weak_areas(user_id: str, threshold: float = 70.0):
    """Get subjects/topics where accuracy is below threshold."""
    try:
        records = await get_user_progress(user_id)
        weak = [
            {"subject": r["subject"], "topic": r["topic"], "accuracy": r["accuracy"]}
            for r in records
            if r["accuracy"] < threshold and r["attempts"] >= 3
        ]
        weak.sort(key=lambda x: x["accuracy"])
        return {"weak_areas": weak[:10]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _generate_weekly_stats(records: list) -> list[dict]:
    """Generate weekly aggregated stats."""
    weeks = []
    now = datetime.now(timezone.utc)
    for i in range(8):
        week_start = now - timedelta(weeks=i + 1)
        week_end = now - timedelta(weeks=i)
        # Filter records for this week (simplified)
        week_records = [
            r for r in records
            if r.get("last_attempt")
            and week_start.isoformat() <= r["last_attempt"] <= week_end.isoformat()
        ]
        total_attempts = sum(r.get("attempts", 0) for r in week_records)
        avg_accuracy = (
            sum(r.get("accuracy", 0) for r in week_records) / len(week_records)
            if week_records else 0
        )
        weeks.append({
            "week": f"Week {8 - i}",
            "accuracy": round(avg_accuracy, 1),
            "attempts": total_attempts,
            "time": total_attempts * 2,
        })
    return list(reversed(weeks))


def _generate_daily_progress(records: list) -> list[dict]:
    """Generate daily progress for last 30 days."""
    days = []
    now = datetime.now(timezone.utc)
    for i in range(30):
        day = now - timedelta(days=29 - i)
        day_str = day.strftime("%Y-%m-%d")
        
        day_records = [
            r for r in records
            if r.get("last_attempt") and r["last_attempt"].startswith(day_str)
        ]
        
        questions = sum(r.get("attempts", 0) for r in day_records)
        accuracy = (
            sum(r.get("accuracy", 0) for r in day_records) / len(day_records)
            if day_records else 0
        )
        
        days.append({
            "date": day_str,
            "questions_attempted": questions,
            "correct": int(questions * accuracy / 100),
            "accuracy": round(accuracy, 1),
            "study_time": questions * 2,
            "xp_earned": questions * 8,
        })
    return days


# ===== Leaderboard Router =====

leaderboard_router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@leaderboard_router.get("", response_model=LeaderboardResponse)
async def get_leaderboard_data(
    user_id: str | None = None,
    limit: int = 20,
    period: str = "weekly",
):
    """Get global leaderboard.
    
    Args:
        period: "weekly" (default, resets every Monday) or "all_time"
    """
    try:
        entries_raw = await get_leaderboard(limit=limit, period=period)

        badges = ["👑", "🥈", "🥉", "🏆", "⭐", "🎯", "💡", "🔥", "📚", "⚡"]
        score_key = "weekly_xp" if period == "weekly" else "total_score"

        entries = [
            LeaderboardEntry(
                rank=i + 1,
                user_id=e["id"],
                name=e["name"],
                score=e.get(score_key, 0),
                streak=e.get("streak", 0),
                accuracy=round(
                    (e.get("total_correct", 0) / max(e.get("total_attempted", 1), 1)) * 100, 1
                ),
                badge=badges[min(i, len(badges) - 1)],
            )
            for i, e in enumerate(entries_raw)
        ]

        my_rank = None
        if user_id:
            match = next((e.rank for e in entries if e.user_id == user_id), None)
            my_rank = match

        return LeaderboardResponse(
            entries=entries,
            my_rank=my_rank,
            total_users=len(entries_raw),
        )
    except Exception as e:
        logger.error(f"Leaderboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


from fastapi.responses import StreamingResponse
from app.schemas.schemas import StudyPlanSaveRequest, StudyPlanChatRequest
from app.services.db.supabase_service import upsert_study_plan, get_study_plan as db_get_study_plan
from app.services.rag.rag_pipeline import study_plan_chat_stream

# ===== Study Plan Router =====

study_plan_router = APIRouter(prefix="/api/study-plan", tags=["Study Plan"])

@study_plan_router.get("/{user_id}", response_model=StudyPlanResponse)
async def get_study_plan_endpoint(user_id: str):
    """Get the user's saved study plan."""
    try:
        plan = await db_get_study_plan(user_id)
        if not plan:
            raise HTTPException(status_code=404, detail="No study plan found")
        return StudyPlanResponse(
            plan=plan.get("plan_text", ""),
            daily_schedule=[],
            weekly_goals=[],
            focus_areas=[]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching study plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@study_plan_router.post("/save", response_model=dict)
async def save_study_plan_endpoint(request: StudyPlanSaveRequest):
    """Manually save or overwrite a study plan."""
    try:
        result = await upsert_study_plan(request.user_id, request.plan_text)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to save study plan")
        return {"status": "success", "message": "Study plan saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving study plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@study_plan_router.post("/chat")
async def chat_study_plan_endpoint(request: StudyPlanChatRequest):
    """Stream AI response for study plan chat."""
    try:
        plan = await db_get_study_plan(request.user_id)
        plan_text = plan.get("plan_text", "No plan found") if plan else "No plan found"
        
        return StreamingResponse(
            study_plan_chat_stream(
                existing_plan=plan_text,
                user_message=request.message,
                chat_history=request.chat_history,
            ),
            media_type="text/event-stream"
        )
    except Exception as e:
        logger.error(f"Study plan chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@study_plan_router.post("", response_model=StudyPlanResponse)
async def create_study_plan(request: StudyPlanRequest):
    """Generate AI-powered study plan and save it."""
    try:
        records = await get_user_progress(request.user_id)
        weak_subjects = sorted(
            set(r["subject"] for r in records if r.get("accuracy", 100) < 70)
        )[:3]

        if not weak_subjects:
            weak_subjects = ["Deep Learning", "Databases", "Statistics"]

        plan_text = await generate_study_plan(
            weak_subjects=weak_subjects,
            days_until_exam=request.days_until_exam,
            daily_hours=request.daily_hours,
        )
        
        # Save the plan to the database automatically
        await upsert_study_plan(request.user_id, plan_text)

        return StudyPlanResponse(
            plan=plan_text,
            daily_schedule=[],
            weekly_goals=[
                f"Complete 150 MCQs in {weak_subjects[0] if weak_subjects else 'ML'}",
                "Take 2 full mock tests",
                f"Master {weak_subjects[1] if len(weak_subjects) > 1 else 'Statistics'} basics",
                "Solve 20 PYQs",
            ],
            focus_areas=weak_subjects,
        )
    except Exception as e:
        logger.error(f"Study plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
