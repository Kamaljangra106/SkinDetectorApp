"""
SkinDetectorApp — FastAPI backend.

Endpoints:
  GET  /api/health          — liveness + readiness check
  POST /api/auth/register   — create account
  POST /api/auth/login      — get JWT (rate limited: 5/min)
  POST /api/analyze         — analyze face image, requires JWT (rate limited: 10/min)
  GET  /api/history         — past analyses for current user
"""

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from groq import APIConnectionError, APIStatusError, AuthenticationError, RateLimitError
from jose import JWTError
from pydantic import BaseModel, EmailStr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

import models
from auth import create_access_token, decode_token, hash_password, verify_password
from config import ALLOWED_ORIGINS, GROQ_API_KEY
from db import Base, engine, get_db
from ml.analyzer import SkinAnalysis, analyze
from ml.recommendations import get_ai_recommendations, get_conflicts, get_recommendations

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
_model_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model_ready
    Base.metadata.create_all(bind=engine)
    _model_ready = True
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="SkinDetectorApp API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()
ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
INFERENCE_TIMEOUT_S = 15
AI_RECS_TIMEOUT_S = 5


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    try:
        payload = decode_token(credentials.credentials)
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    model_ready: bool
    groq_key_configured: bool


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Ingredient(BaseModel):
    key: str
    name: str
    benefit: str


class AiIngredient(BaseModel):
    name: str
    benefit: str


class Conflict(BaseModel):
    ingredient_a: str
    ingredient_b: str
    reason: str
    timing_advice: str


class AnalysisResponse(BaseModel):
    id: int
    skin_type: str
    acne_severity: str
    fitzpatrick_estimate: str
    primary_concerns: list[str]
    confidence: float
    accuracy_disclaimer: bool
    recommendations: list[Ingredient]
    ai_recommendations: list[AiIngredient]
    conflicts: list[Conflict]
    elapsed_ms: int
    created_at: str


class HistoryItem(BaseModel):
    id: int
    skin_type: str
    acne_severity: str
    fitzpatrick_estimate: str
    primary_concerns: list[str]
    confidence: float
    accuracy_disclaimer: bool
    recommendations: list[Ingredient]
    ai_recommendations: list[AiIngredient]
    conflicts: list[Conflict]
    elapsed_ms: int
    created_at: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model_ready=_model_ready,
        groq_key_configured=bool(GROQ_API_KEY),
    )


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    user = models.User(email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created.", "user_id": user.id}


@app.post("/api/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user_id=user.id, email=user.email)
    return TokenResponse(access_token=token)


@app.post("/api/analyze", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_skin(
    request: Request,
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=415, detail=f"Unsupported file type '{file.content_type}'.")

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large. Maximum 10 MB.")
    if len(image_bytes) < 1024:
        raise HTTPException(status_code=422, detail="Image too small or empty.")

    t0 = time.monotonic()
    try:
        result: SkinAnalysis = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None, analyze, image_bytes, file.content_type
            ),
            timeout=INFERENCE_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        logger.error("groq_vision_timeout", extra={"user_id": user_id})
        raise HTTPException(status_code=504, detail="Inference timed out. Try again.")
    except ValueError as e:
        logger.error("groq_invalid_json", extra={"user_id": user_id, "error": str(e)})
        raise HTTPException(status_code=502, detail=f"Model error: {e}")
    except (RateLimitError, AuthenticationError, APIConnectionError, APIStatusError) as e:
        logger.error("groq_api_error", extra={"user_id": user_id, "error_type": type(e).__name__})
        raise HTTPException(status_code=503, detail="Skin analysis service temporarily unavailable.")

    elapsed_ms = int((time.monotonic() - t0) * 1000)

    recommendations = get_recommendations(
        skin_type=result.skin_type,
        acne_severity=result.acne_severity,
        primary_concerns=result.primary_concerns,
        is_darker_tone=result.is_darker_tone,
    )

    # Detect conflicts between recommended ingredients
    ingredient_keys = [r["key"] for r in recommendations]
    conflicts = get_conflicts(ingredient_keys)

    # AI recs: secondary Groq text call with 5s timeout — degrades to [] on timeout
    try:
        ai_recommendations = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None,
                lambda: get_ai_recommendations(
                    skin_type=result.skin_type,
                    acne_severity=result.acne_severity,
                    fitzpatrick_estimate=result.fitzpatrick_estimate,
                    primary_concerns=result.primary_concerns,
                    is_darker_tone=result.is_darker_tone,
                ),
            ),
            timeout=AI_RECS_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        logger.warning("ai_recs_timeout", extra={"user_id": user_id})
        ai_recommendations = []

    # Show accuracy disclaimer only when darker tone AND redness/erythema is a concern
    accuracy_disclaimer = result.is_darker_tone and any(
        "redness" in c.lower() or "erythema" in c.lower()
        for c in result.primary_concerns
    )

    # Save to DB — results only, no image stored
    try:
        record = models.Analysis(
            user_id=user_id,
            skin_type=result.skin_type,
            acne_severity=result.acne_severity,
            fitzpatrick_estimate=result.fitzpatrick_estimate,
            primary_concerns=json.dumps(result.primary_concerns),
            recommendations=json.dumps(recommendations),
            ai_recommendations=json.dumps(ai_recommendations),
            conflicts=json.dumps(conflicts),
            confidence=result.confidence,
            accuracy_disclaimer=int(accuracy_disclaimer),
            elapsed_ms=elapsed_ms,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    except OperationalError:
        logger.error("db_write_failed", extra={"user_id": user_id})
        raise HTTPException(status_code=503, detail="Database temporarily unavailable.")

    logger.info(
        "analyze_complete",
        extra={
            "user_id": user_id,
            "skin_type": result.skin_type,
            "acne_severity": result.acne_severity,
            "fitzpatrick": result.fitzpatrick_estimate,
            "confidence": result.confidence,
            "elapsed_ms": elapsed_ms,
            "conflicts_found": len(conflicts),
        },
    )

    return AnalysisResponse(
        id=record.id,
        skin_type=result.skin_type,
        acne_severity=result.acne_severity,
        fitzpatrick_estimate=result.fitzpatrick_estimate,
        primary_concerns=result.primary_concerns,
        confidence=result.confidence,
        accuracy_disclaimer=accuracy_disclaimer,
        recommendations=recommendations,
        ai_recommendations=ai_recommendations,
        conflicts=conflicts,
        elapsed_ms=elapsed_ms,
        created_at=record.created_at.isoformat(),
    )


@app.get("/api/history", response_model=list[HistoryItem])
async def get_history(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
):
    records = (
        db.query(models.Analysis)
        .filter(models.Analysis.user_id == user_id)
        .order_by(models.Analysis.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        HistoryItem(
            id=r.id,
            skin_type=r.skin_type,
            acne_severity=r.acne_severity,
            fitzpatrick_estimate=r.fitzpatrick_estimate,
            primary_concerns=json.loads(r.primary_concerns),
            confidence=r.confidence,
            accuracy_disclaimer=bool(r.accuracy_disclaimer),
            recommendations=json.loads(r.recommendations),
            ai_recommendations=json.loads(r.ai_recommendations),
            conflicts=json.loads(r.conflicts) if r.conflicts else [],
            elapsed_ms=r.elapsed_ms,
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]
