from fastapi import APIRouter, HTTPException
import uuid
import random
import logging
from datetime import datetime, timezone

from app.schemas.schemas import MockTestConfig, MockTestResponse, MockTestSubmitRequest, MockTestResult
from app.services.db.supabase_service import save_mock_test_result, update_user_stats
from app.data.seed_data import SEED_MCQS

router = APIRouter(prefix="/api/mock-test", tags=["Mock Test"])
logger = logging.getLogger(__name__)


def calculate_xp(score: int, total: int, duration: int, total_time: int) -> int:
    """Calculate XP based on performance and speed."""
    accuracy = score / total
    base_xp = score * 10  # 10 XP per correct answer
    accuracy_bonus = int(accuracy * 100) if accuracy >= 0.8 else 0
    speed_bonus = 50 if duration < total_time * 0.7 else 0
    perfect_bonus = 500 if score == total else 0
    return base_xp + accuracy_bonus + speed_bonus + perfect_bonus


@router.post("/generate", response_model=MockTestResponse)
async def generate_mock_test(config: MockTestConfig):
    """Generate a new mock test."""
    try:
        pool = SEED_MCQS.copy()

        if config.subject.value != "Mixed":
            pool = [m for m in pool if m["subject"] == config.subject.value]

        if not pool:
            pool = SEED_MCQS

        # Select questions with difficulty distribution
        if config.difficulty.value == "Easy":
            weights = {"Easy": 0.6, "Medium": 0.3, "Hard": 0.1}
        elif config.difficulty.value == "Medium":
            weights = {"Easy": 0.2, "Medium": 0.5, "Hard": 0.3}
        else:
            weights = {"Easy": 0.1, "Medium": 0.4, "Hard": 0.5}

        easy = [m for m in pool if m["difficulty"] == "Easy"]
        medium = [m for m in pool if m["difficulty"] == "Medium"]
        hard = [m for m in pool if m["difficulty"] == "Hard"]

        target = min(config.question_count, len(pool))
        n_easy = int(target * weights["Easy"])
        n_medium = int(target * weights["Medium"])
        n_hard = target - n_easy - n_medium

        selected = (
            random.sample(easy, min(n_easy, len(easy)))
            + random.sample(medium, min(n_medium, len(medium)))
            + random.sample(hard, min(n_hard, len(hard)))
        )

        # Fill remaining if needed
        remaining = target - len(selected)
        if remaining > 0:
            extras = [m for m in pool if m not in selected]
            selected += random.sample(extras, min(remaining, len(extras)))

        random.shuffle(selected)

        test_id = str(uuid.uuid4())
        return MockTestResponse(
            id=test_id,
            title=f"GATE DS Mock Test — {config.subject.value}",
            subject=config.subject,
            questions=selected,
            duration=config.duration,
            total_marks=len(selected),
            created_at=datetime.now(timezone.utc),
        )
    except Exception as e:
        logger.error(f"Mock test generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit", response_model=MockTestResult)
async def submit_mock_test(request: MockTestSubmitRequest):
    """Submit mock test answers and get results."""
    try:
        # Score the test
        questions = {m["id"]: m for m in SEED_MCQS}
        score = 0
        total = len(request.answers)
        weak_areas = []
        subject_breakdown: dict = {}

        for mcq_id, user_answer in request.answers.items():
            mcq = questions.get(mcq_id)
            if not mcq:
                continue

            subject = mcq["subject"]
            topic = mcq["topic"]

            if subject not in subject_breakdown:
                subject_breakdown[subject] = {"correct": 0, "total": 0, "accuracy": 0}

            subject_breakdown[subject]["total"] += 1
            correct = user_answer == mcq["answer"]

            if correct:
                score += 1
                subject_breakdown[subject]["correct"] += 1
            else:
                if topic not in weak_areas:
                    weak_areas.append(topic)

        # Calculate per-subject accuracy
        for subj, data in subject_breakdown.items():
            if data["total"] > 0:
                data["accuracy"] = round((data["correct"] / data["total"]) * 100, 1)

        accuracy = round((score / total) * 100, 1) if total > 0 else 0
        xp_earned = calculate_xp(score, total, request.time_taken, 10800)  # 3hr total

        # Save result
        result_data = {
            "id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "test_id": request.test_id,
            "score": score,
            "total": total,
            "accuracy": accuracy,
            "duration": request.time_taken,
            "weak_areas": weak_areas[:5],
            "subject_breakdown": subject_breakdown,
            "xp_earned": xp_earned,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        await save_mock_test_result(result_data)
        await update_user_stats(
            user_id=request.user_id,
            xp_delta=xp_earned,
            correct_count=score,
            attempt_count=total,
        )

        return MockTestResult(
            id=result_data["id"],
            score=score,
            total=total,
            accuracy=accuracy,
            duration=request.time_taken,
            weak_areas=weak_areas[:5],
            subject_breakdown=subject_breakdown,
            xp_earned=xp_earned,
        )
    except Exception as e:
        logger.error(f"Mock test submission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{user_id}")
async def get_test_history(user_id: str, limit: int = 10):
    """Get mock test history for a user."""
    from app.services.db.supabase_service import get_mock_test_history
    return await get_mock_test_history(user_id, limit)
