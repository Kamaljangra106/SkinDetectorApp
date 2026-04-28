"""
Integration tests for FastAPI endpoints.

Uses TestClient with an in-memory SQLite DB and mocked Groq calls.
No real API calls are made.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # noqa: F401 — registers ORM tables with Base.metadata before create_all
from db import Base, get_db
from main import app

# ---------------------------------------------------------------------------
# Test DB setup — in-memory SQLite with StaticPool so all connections share
# the same in-memory database (avoids "no such table" across connections).
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    # Reset slowapi in-memory rate limit counters so tests don't bleed into each other.
    try:
        app.state.limiter._limiter.storage.reset()
    except Exception:
        pass
    yield
    Base.metadata.drop_all(bind=test_engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
GROQ_ANALYSIS_PAYLOAD = {
    "skin_type": "oily",
    "acne_severity": "mild",
    "fitzpatrick_estimate": "IV",
    "primary_concerns": ["acne"],
    "confidence": 0.85,
}


def _mock_groq_vision(payload: dict = GROQ_ANALYSIS_PAYLOAD):
    """Build a fake Groq vision response."""
    msg = MagicMock()
    msg.content = json.dumps(payload)
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _mock_groq_ai_recs():
    """Build a fake Groq text response for AI recommendations."""
    msg = MagicMock()
    msg.content = json.dumps([
        {"name": "Niacinamide", "benefit": "Controls oil and reduces acne for oily skin."},
        {"name": "Salicylic Acid", "benefit": "Unclogs pores on oily acne-prone skin."},
        {"name": "Azelaic Acid", "benefit": "Reduces inflammation for mild acne."},
    ])
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _register_and_login(email: str = "test@example.com", password: str = "password123") -> str:
    """Register a user and return a valid JWT token."""
    client.post("/api/auth/register", json={"email": email, "password": password})
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# /api/health
# ---------------------------------------------------------------------------
def test_health_returns_ok():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "model_ready" in data
    assert "groq_key_configured" in data


# ---------------------------------------------------------------------------
# /api/auth/register
# ---------------------------------------------------------------------------
def test_register_success():
    res = client.post("/api/auth/register", json={"email": "new@example.com", "password": "securepass"})
    assert res.status_code == 201
    assert "user_id" in res.json()


def test_register_duplicate_email():
    client.post("/api/auth/register", json={"email": "dup@example.com", "password": "securepass"})
    res = client.post("/api/auth/register", json={"email": "dup@example.com", "password": "securepass"})
    assert res.status_code == 409


def test_register_short_password():
    res = client.post("/api/auth/register", json={"email": "short@example.com", "password": "abc"})
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# /api/auth/login
# ---------------------------------------------------------------------------
def test_login_success():
    client.post("/api/auth/register", json={"email": "login@example.com", "password": "securepass"})
    res = client.post("/api/auth/login", json={"email": "login@example.com", "password": "securepass"})
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["token_type"] == "bearer"


def test_login_wrong_password():
    client.post("/api/auth/register", json={"email": "wp@example.com", "password": "securepass"})
    res = client.post("/api/auth/login", json={"email": "wp@example.com", "password": "wrongpass"})
    assert res.status_code == 401


def test_login_unknown_email():
    res = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "pass1234"})
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# /api/analyze
# ---------------------------------------------------------------------------
FAKE_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 2048  # minimal JPEG-like header


@patch("ml.recommendations._groq_client")
@patch("ml.analyzer._groq_client")
def test_analyze_success(mock_analyzer_client, mock_recs_client):
    mock_analyzer_client.chat.completions.create.return_value = _mock_groq_vision()
    mock_recs_client.chat.completions.create.return_value = _mock_groq_ai_recs()

    token = _register_and_login()
    res = client.post(
        "/api/analyze",
        files={"file": ("capture.jpg", FAKE_JPEG, "image/jpeg")},
        headers=_auth_headers(token),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["skin_type"] == "oily"
    assert data["acne_severity"] == "mild"
    assert data["fitzpatrick_estimate"] == "IV"
    assert isinstance(data["recommendations"], list)
    assert isinstance(data["ai_recommendations"], list)
    assert isinstance(data["conflicts"], list)
    assert "elapsed_ms" in data
    assert data["accuracy_disclaimer"] is False  # no redness in concerns


@patch("ml.recommendations._groq_client")
@patch("ml.analyzer._groq_client")
def test_analyze_accuracy_disclaimer_only_for_redness(mock_analyzer_client, mock_recs_client):
    """Disclaimer should be True only when fitzpatrick IV-VI AND redness is a concern."""
    payload_with_redness = {**GROQ_ANALYSIS_PAYLOAD, "fitzpatrick_estimate": "V", "primary_concerns": ["redness"]}
    mock_analyzer_client.chat.completions.create.return_value = _mock_groq_vision(payload_with_redness)
    mock_recs_client.chat.completions.create.return_value = _mock_groq_ai_recs()

    token = _register_and_login("redness@example.com")
    res = client.post(
        "/api/analyze",
        files={"file": ("capture.jpg", FAKE_JPEG, "image/jpeg")},
        headers=_auth_headers(token),
    )
    assert res.status_code == 200
    assert res.json()["accuracy_disclaimer"] is True


@patch("ml.recommendations._groq_client")
@patch("ml.analyzer._groq_client")
def test_analyze_no_disclaimer_for_darker_tone_without_redness(mock_analyzer_client, mock_recs_client):
    """Darker tone + acne only should NOT trigger disclaimer."""
    payload_no_redness = {**GROQ_ANALYSIS_PAYLOAD, "fitzpatrick_estimate": "V", "primary_concerns": ["acne"]}
    mock_analyzer_client.chat.completions.create.return_value = _mock_groq_vision(payload_no_redness)
    mock_recs_client.chat.completions.create.return_value = _mock_groq_ai_recs()

    token = _register_and_login("nodisclaimer@example.com")
    res = client.post(
        "/api/analyze",
        files={"file": ("capture.jpg", FAKE_JPEG, "image/jpeg")},
        headers=_auth_headers(token),
    )
    assert res.status_code == 200
    assert res.json()["accuracy_disclaimer"] is False


def test_analyze_without_token():
    res = client.post(
        "/api/analyze",
        files={"file": ("capture.jpg", FAKE_JPEG, "image/jpeg")},
    )
    assert res.status_code in (401, 403)  # HTTPBearer returns 403 on older Starlette, 401 on newer


def test_analyze_unsupported_mime():
    token = _register_and_login("mime@example.com")
    res = client.post(
        "/api/analyze",
        files={"file": ("doc.pdf", b"fake pdf content " * 100, "application/pdf")},
        headers=_auth_headers(token),
    )
    assert res.status_code == 415


def test_analyze_image_too_small():
    token = _register_and_login("small@example.com")
    res = client.post(
        "/api/analyze",
        files={"file": ("tiny.jpg", b"\xff\xd8\xff", "image/jpeg")},
        headers=_auth_headers(token),
    )
    assert res.status_code == 422


@patch("ml.recommendations._groq_client")
@patch("ml.analyzer._groq_client")
def test_analyze_groq_rate_limit_returns_503(mock_analyzer_client, mock_recs_client):
    from groq import RateLimitError as GroqRateLimitError
    mock_analyzer_client.chat.completions.create.side_effect = GroqRateLimitError(
        message="rate limit exceeded", response=MagicMock(status_code=429, headers={}), body={}
    )
    token = _register_and_login("ratelimit@example.com")
    res = client.post(
        "/api/analyze",
        files={"file": ("capture.jpg", FAKE_JPEG, "image/jpeg")},
        headers=_auth_headers(token),
    )
    assert res.status_code == 503


# ---------------------------------------------------------------------------
# /api/history
# ---------------------------------------------------------------------------
@patch("ml.recommendations._groq_client")
@patch("ml.analyzer._groq_client")
def test_history_returns_past_analyses(mock_analyzer_client, mock_recs_client):
    mock_analyzer_client.chat.completions.create.return_value = _mock_groq_vision()
    mock_recs_client.chat.completions.create.return_value = _mock_groq_ai_recs()

    token = _register_and_login("history@example.com")
    headers = _auth_headers(token)

    # Create one analysis
    client.post("/api/analyze", files={"file": ("c.jpg", FAKE_JPEG, "image/jpeg")}, headers=headers)

    res = client.get("/api/history", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["skin_type"] == "oily"
    assert "conflicts" in items[0]


def test_history_empty_for_new_user():
    token = _register_and_login("empty@example.com")
    res = client.get("/api/history", headers=_auth_headers(token))
    assert res.status_code == 200
    assert res.json() == []


def test_history_without_token():
    res = client.get("/api/history")
    assert res.status_code in (401, 403)  # HTTPBearer returns 403 on older Starlette, 401 on newer


def test_history_limit_max_100():
    token = _register_and_login("limitcheck@example.com")
    res = client.get("/api/history?limit=200", headers=_auth_headers(token))
    # FastAPI Query validation should reject limit > 100
    assert res.status_code == 422
