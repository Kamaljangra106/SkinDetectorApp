"""
SkinDetectorApp — FastAPI backend.

Endpoints:
  GET  /api/health          — liveness check
  POST /api/auth/register   — create account
  POST /api/auth/login      — get JWT (rate limited: 5/min)
  POST /api/analyze         — analyze face image, requires JWT (rate limited: 10/min)
"""

import asyncio
import os
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from pydantic import BaseModel, EmailStr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

import models
from auth import create_access_token, decode_token, hash_password, verify_password
from db import Base, engine, get_db
from ml.analyzer import SkinAnalysis, analyze

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
    # Create DB tables on first run
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
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()
ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
INFERENCE_TIMEOUT_S = 15


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


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AnalysisResponse(BaseModel):
    skin_type: str
    acne_severity: str
    fitzpatrick_estimate: str
    primary_concerns: list[str]
    confidence: float
    accuracy_disclaimer: bool
    elapsed_ms: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", model_ready=_model_ready)


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
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Send JPEG, PNG, or WebP.",
        )

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
        raise HTTPException(status_code=504, detail="Inference timed out. Try again.")
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"Model error: {e}")

    elapsed_ms = int((time.monotonic() - t0) * 1000)

    return AnalysisResponse(
        skin_type=result.skin_type,
        acne_severity=result.acne_severity,
        fitzpatrick_estimate=result.fitzpatrick_estimate,
        primary_concerns=result.primary_concerns,
        confidence=result.confidence,
        accuracy_disclaimer=result.is_darker_tone,
        elapsed_ms=elapsed_ms,
    )
