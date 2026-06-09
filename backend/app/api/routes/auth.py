from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import PyJWTError
import bcrypt
from datetime import datetime, timezone, timedelta
import uuid
import logging

from app.schemas.schemas import UserRegister, UserLogin, Token, UserResponse, Badge
from app.services.db.supabase_service import get_user_by_email, create_user, get_user_by_id
from app.core.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])
settings = get_settings()
logger = logging.getLogger(__name__)

security = HTTPBearer()

DEFAULT_BADGES = [
    Badge(id="b1", name="First Blood", description="Solved your first MCQ", icon="⚡", unlocked=False),
    Badge(id="b2", name="Week Warrior", description="7-day streak", icon="🔥", unlocked=False),
    Badge(id="b3", name="Speed Demon", description="Completed mock test in half time", icon="🚀", unlocked=False),
    Badge(id="b4", name="Perfect Score", description="100% in a mock test", icon="💎", unlocked=False),
    Badge(id="b5", name="AI Scholar", description="Used AI tutor 100 times", icon="🤖", unlocked=False),
    Badge(id="b6", name="Month Master", description="30-day streak", icon="👑", unlocked=False),
]


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    plain_bytes = plain.encode("utf-8")
    hashed_bytes = hashed.encode("utf-8")
    try:
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except PyJWTError:
        return None



async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/register", response_model=Token)
async def register(request: UserRegister):
    """Register a new user."""
    existing = await get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "name": request.name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "streak": 0,
        "total_score": 0,
        "xp": 0,
        "level": 1,
        "weak_subjects": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    user = await create_user(user_data)
    if not user:
        raise HTTPException(status_code=400, detail="Registration failed. Email might already be in use.")

    token = create_access_token(user_id)
    return Token(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=request.name,
            email=request.email,
            streak=0,
            total_score=0,
            xp=0,
            level=1,
            weak_subjects=[],
            created_at=datetime.now(timezone.utc),
            badges=DEFAULT_BADGES,
            role="user",
        ),
    )


@router.post("/login", response_model=Token)
async def login(request: UserLogin):
    """Authenticate user and return token."""
    user = await get_user_by_email(request.email)
    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user["id"])
    return Token(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            streak=user.get("streak", 0),
            total_score=user.get("total_score", 0),
            xp=user.get("xp", 0),
            level=user.get("level", 1),
            weak_subjects=user.get("weak_subjects", []),
            created_at=datetime.fromisoformat(user["created_at"]),
            badges=DEFAULT_BADGES,
            role=user.get("role", "user"),
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        streak=current_user.get("streak", 0),
        total_score=current_user.get("total_score", 0),
        xp=current_user.get("xp", 0),
        level=current_user.get("level", 1),
        weak_subjects=current_user.get("weak_subjects", []),
        created_at=datetime.fromisoformat(current_user["created_at"]),
        badges=DEFAULT_BADGES,
        role=current_user.get("role", "user"),
    )


@router.post("/google")
async def google_auth(body: dict):
    """Handle Google OAuth token."""
    google_token = body.get("token")
    if not google_token:
        raise HTTPException(status_code=400, detail="Google token required")
    # In production, verify with Google and create/find user
    raise HTTPException(status_code=501, detail="Google auth requires Supabase Auth configuration")
