import os
import warnings

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production-use-a-long-random-string")
if SECRET_KEY == "change-me-in-production-use-a-long-random-string":
    warnings.warn(
        "SECRET_KEY is using the default insecure value! "
        "Set SECRET_KEY env var before production deploy. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./skindetector.db")
# Comma-separated in production: https://app.example.com,https://www.example.com
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
