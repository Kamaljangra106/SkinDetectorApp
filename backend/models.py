from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    skin_type: Mapped[str] = mapped_column(String(50), nullable=False)
    acne_severity: Mapped[str] = mapped_column(String(50), nullable=False)
    fitzpatrick_estimate: Mapped[str] = mapped_column(String(10), nullable=False)
    primary_concerns: Mapped[str] = mapped_column(Text, nullable=False, default="[]")   # JSON array
    recommendations: Mapped[str] = mapped_column(Text, nullable=False, default="[]")    # JSON array
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy_disclaimer: Mapped[bool] = mapped_column(Integer, nullable=False, default=0)
    elapsed_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
