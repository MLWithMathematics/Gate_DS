from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


# ===== Enums =====

class Subject(str, Enum):
    MATHEMATICS = "Mathematics"
    STATISTICS = "Statistics"
    MACHINE_LEARNING = "Machine Learning"
    DEEP_LEARNING = "Deep Learning"
    DATA_SCIENCE = "Data Science"
    PROGRAMMING = "Programming"
    LINEAR_ALGEBRA = "Linear Algebra"
    PROBABILITY = "Probability"
    ALGORITHMS = "Algorithms"
    DATABASES = "Databases"
    MIXED = "Mixed"
    ARTIFICIAL_INTELLIGENCE = "Artificial Intelligence"
    GENERAL_APTITUDE = "General Aptitude"


class Difficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class SourceType(str, Enum):
    PYQ = "PYQ"
    GENERATED = "Generated"
    CUSTOM = "Custom"


# ===== MCQ Schemas =====

class MCQOption(BaseModel):
    id: str
    text: str
    latex: Optional[str] = None


class MCQBase(BaseModel):
    subject: str
    topic: str
    question: str
    options: List[MCQOption]
    answer: str
    explanation: str
    difficulty: str
    source_type: str = "Generated"
    year: Optional[int] = None
    tags: Optional[List[str]] = []


class MCQCreate(MCQBase):
    pass


class MCQResponse(MCQBase):
    id: str
    bookmarked: Optional[bool] = False

    class Config:
        from_attributes = True


class MCQGenerateRequest(BaseModel):
    subject: Subject
    topic: str
    difficulty: Difficulty
    count: int = Field(default=5, ge=1, le=20)
    style: str = "GATE"  # "GATE", "conceptual", "numerical"


class MCQSubmitRequest(BaseModel):
    mcq_id: str
    answer: str
    user_id: str
    time_taken: Optional[int] = None  # seconds


class MCQSubmitResponse(BaseModel):
    correct: bool
    correct_answer: str
    explanation: str
    xp_earned: int
    already_attempted: bool = False


# ===== Mock Test Schemas =====

class MockTestConfig(BaseModel):
    subject: Subject = Subject.MIXED
    duration: int = Field(default=180, ge=30, le=360)  # minutes
    difficulty: Difficulty = Difficulty.MEDIUM
    question_count: int = Field(default=65, ge=10, le=100)


class MockTestResponse(BaseModel):
    id: str
    title: str
    subject: Subject
    questions: List[MCQResponse]
    duration: int
    total_marks: int
    created_at: datetime


class MockTestSubmitRequest(BaseModel):
    test_id: str
    user_id: str
    answers: Dict[str, str]
    time_taken: int  # seconds


class MockTestResult(BaseModel):
    id: str
    score: int
    total: int
    accuracy: float
    duration: int
    weak_areas: List[str]
    subject_breakdown: Dict[str, Dict[str, Any]]
    xp_earned: int
    rank_percentile: Optional[float] = None


# ===== RAG / Doubt Solver =====

class DoubtRequest(BaseModel):
    question: str
    subject: Optional[Subject] = None
    topic: Optional[str] = None
    user_id: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = []
    mode: str = "detailed"  # "detailed", "simple", "formula"


class DoubtResponse(BaseModel):
    answer: str
    sources: List[str] = []
    follow_up_questions: List[str] = []
    cached: bool = False
    model_used: str


class StreamToken(BaseModel):
    token: str
    done: bool = False


# ===== User & Auth =====

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Badge(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: Optional[datetime] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    streak: int
    total_score: int
    xp: int
    level: int
    weak_subjects: List[str]
    created_at: datetime
    badges: List[Badge] = []
    role: str = "user"

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ===== Progress =====

class ProgressUpdate(BaseModel):
    user_id: str
    subject: Subject
    topic: str
    correct: bool
    time_taken: Optional[int] = None


class TopicProgress(BaseModel):
    topic: str
    accuracy: float
    attempts: int
    mastery: float


class SubjectProgressResponse(BaseModel):
    subject: Subject
    accuracy: float
    attempts: int
    mastery: float
    last_attempt: Optional[datetime]
    topics: List[TopicProgress]


class UserProgressResponse(BaseModel):
    subject_progress: List[SubjectProgressResponse]
    weekly_stats: List[Dict[str, Any]]
    daily_progress: List[Dict[str, Any]]
    attempted_mcqs: Dict[str, bool]
    streak: int
    total_xp: int


# ===== Syllabus / RAG =====

class SyllabusChunk(BaseModel):
    id: str
    subject: Subject
    topic: str
    content: str
    subtopics: Optional[List[str]] = []


class SyllabusChunkCreate(BaseModel):
    subject: Subject
    topic: str
    content: str
    subtopics: Optional[List[str]] = []


# ===== Chat Cache =====

class ChatCacheEntry(BaseModel):
    id: str
    query_hash: str
    response: str
    created_at: datetime


# ===== Study Plan =====

class StudyPlanRequest(BaseModel):
    user_id: str
    days_until_exam: int = Field(default=60, ge=7, le=365)
    daily_hours: int = Field(default=4, ge=1, le=12)
    target_score: int = Field(default=80, ge=50, le=100)

class StudyPlanSaveRequest(BaseModel):
    user_id: str
    plan_text: str

class StudyPlanChatRequest(BaseModel):
    user_id: str
    message: str
    chat_history: Optional[List[Dict[str, str]]] = []


class StudyPlanResponse(BaseModel):
    plan: str
    daily_schedule: List[Dict[str, Any]]
    weekly_goals: List[str]
    focus_areas: List[str]


# ===== Leaderboard =====

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    score: int
    streak: int
    accuracy: float
    badge: str


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    my_rank: Optional[int] = None
    total_users: int


# ===== Generic =====

class APIResponse(BaseModel):
    status: str = "success"
    message: Optional[str] = None
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int
